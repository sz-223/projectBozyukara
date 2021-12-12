const {
	AudioPlayer,
	AudioPlayerStatus,
	AudioResource,
	createAudioPlayer,
	entersState,
	VoiceConnection,
	VoiceConnectionDisconnectReason,
	VoiceConnectionStatus,
  NoSubscriberBehavior,
} = require('@discordjs/voice');
const { Track } = require('./track');
const { promisify } = require('node:util');

const wait = promisify(setTimeout);
const musicChannelid = process.env.MUSIC_TEXTCHANNEL_ID;

/**
 * A MusicSubscription exists for each active VoiceConnection. Each subscription has its own audio player and queue,
 * and it also attaches logic to the audio player and voice connection for error handling and reconnection logic.
 */
class MusicSubscription {
  
	constructor(voiceConnection) {
    this.queueLock = false;
	  this.eadyLock = false;
		this.voiceConnection = voiceConnection;
		this.audioPlayer = createAudioPlayer({
     behaviors: {
       noSubscriber: NoSubscriberBehavior.Pause,
     },
   });
		this.queue = [];
    this.loop = false;

		this.voiceConnection.on('stateChange', async (_, newState) => {
      console.log("check1");
      console.log(newState.status);
			if (newState.status === VoiceConnectionStatus.Disconnected) {
				if (newState.reason === VoiceConnectionDisconnectReason.WebSocketClose && newState.closeCode === 4014) {
					/**
					 * If the WebSocket closed with a 4014 code, this means that we should not manually attempt to reconnect,
					 * but there is a chance the connection will recover itself if the reason of the disconnect was due to
					 * switching voice channels. This is also the same code for the bot being kicked from the voice channel,
					 * so we allow 5 seconds to figure out which scenario it is. If the bot has been kicked, we should destroy
					 * the voice connection.
					 */
					try {
						await entersState(this.voiceConnection, VoiceConnectionStatus.Connecting, 5 * 1000);
						// Probably moved voice channel
					} catch {
						this.voiceConnection.destroy();
						// Probably removed from voice channel
					}
				} else if (this.voiceConnection.rejoinAttempts < 5) {
					/**
					 * The disconnect in this case is recoverable, and we also have <5 repeated attempts so we will reconnect.
					 */
					await wait((this.voiceConnection.rejoinAttempts + 1) * 5 * 1000);
					this.voiceConnection.rejoin();
				} else {
					/**
					 * The disconnect in this case may be recoverable, but we have no more remaining attempts - destroy.
					 */
					this.voiceConnection.destroy();
				}
			} else if (newState.status === VoiceConnectionStatus.Destroyed) {
				/**
				 * Once destroyed, stop the subscription.
				 */
				this.stop();
			} else if (
				!this.readyLock &&
				(newState.status === VoiceConnectionStatus.Connecting || newState.status === VoiceConnectionStatus.Signalling)
			) {
				/**
				 * In the Signalling or Connecting states, we set a 20 second time limit for the connection to become ready
				 * before destroying the voice connection. This stops the voice connection permanently existing in one of these
				 * states.
				 */
				this.readyLock = true;
				try {
					await entersState(this.voiceConnection, VoiceConnectionStatus.Ready, 20 * 1000);
				} catch {
					if (this.voiceConnection.state.status !== VoiceConnectionStatus.Destroyed) this.voiceConnection.destroy();
				} finally {
					this.readyLock = false;
				}
			}
		});

		// Configure audio player
		this.audioPlayer.on('stateChange', (oldState, newState) => {
			if (newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle) {
				// If the Idle state is entered from a non-Idle state, it means that an audio resource has finished playing.
				// The queue is then processed to start playing the next track, if one is available.      
        if(this.loop == true)this.queue.push((oldState.resource).metadata);
				(oldState.resource).metadata.onFinish();
        if(this.queue.length === 0){
          this.message.channel.send("The queue is empty.");
        }
				void this.processQueue();
			} else if (newState.status === AudioPlayerStatus.Playing) {
				// If the Playing state has been entered, then a new track has started playback.
				(newState.resource).metadata.onStart();
			}
		});

		this.audioPlayer.on('error', (error) => (error.resource).metadata.onError(error));

		voiceConnection.subscribe(this.audioPlayer);
	}

	/**
	 * Adds a new Track to the queue.
	 *
	 * @param track The track to add to the queue
	 */
	enqueue(track) {
    console.log(track);
		this.queue.push(track);
		void this.processQueue();
	}

	/**
	 * Stops audio playback and empties the queue.
	 */
	stop() {
		this.queueLock = true;
		this.queue = [];
		this.audioPlayer.stop(true);
	}

	/**
	 * Attempts to play a Track from the queue.
	 */
	async processQueue(){
		// If the queue is locked (already being processed), is empty, or the audio player is already playing something, return
		if (this.queueLock || this.audioPlayer.state.status !== AudioPlayerStatus.Idle || this.queue.length === 0) {
			return;
		}
		// Lock the queue to guarantee safe access
		this.queueLock = true;

		// Take the first item from the queue. This is guaranteed to exist due to the non-empty check above.
		const nextTrack = this.queue.shift();
		//try {
			// Attempt to convert the Track into an AudioResource (i.e. start streaming the video)
      this.message.channel.send(`Next ⏩ **${nextTrack.title}**`);
			const resource = await nextTrack.createAudioResource()
      .catch(error => {
        nextTrack.onError(error);
			  this.queueLock = false;
			  return this.processQueue();
      });
			this.audioPlayer.play(resource);
			this.queueLock = false;
		/*} catch (error) {
			// If an error occurred, try the next item of the queue instead
			nextTrack.onError(error);
			this.queueLock = false;
			return this.processQueue();
		}*/
	}
  
  async registerMessage(message){
    this.message = message;
  }
}

module.exports = {
  MusicSubscription: MusicSubscription
}