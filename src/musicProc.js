const ytdl = require('ytdl-core');
const { MusicSubscription } = require('./music/subscription.js');
const { Track, TrackFrom } = require('./music/track.js');
const { entersState, AudioPlayerStatus, VoiceConnectionStatus, createAudioPlayer, createAudioResource, joinVoiceChannel,  StreamType, NoSubscriberBehavior } = require('@discordjs/voice');

var subscription;

async function musicPlay(message){
  // メッセージから動画URLだけを取り出す
  const url = message.content.split(' ')[1];
  if (!ytdl.validateURL(url)) return message.reply(`${url}は処理できません。`);
  // コマンドを実行したメンバーがいるボイスチャンネルを取得
  const channel = message.member.voice.channel;
  // コマンドが実行されたテキストチャンネルを取得
  const chatChannel = message.channel;
  // コマンドを実行したメンバーがボイスチャンネルに入ってなければ処理を止める
  if (!channel) return message.reply('先にボイスチャンネルに参加してください！');
  
  //await interaction.defer();

		// If a connection to the guild doesn't already exist and the user is in a voice channel, join that channel
		// and create a subscription.

		if (!subscription) {
			//const channel = message.channel;
      const connection = joinVoiceChannel({
					channelId: channel.id,
					guildId: channel.guild.id,
			  	adapterCreator: channel.guild.voiceAdapterCreator,
          selfDeaf: true,
          selfMute: false,
				});
      console.log(connection);
			subscription = new MusicSubscription(
				connection
			);
			subscription.voiceConnection.on('error', console.warn);
      console.log(subscription.voiceConnection._events.error);
    }
		// Make sure the connection is ready before processing the user's request
		try {
			await entersState(subscription.voiceConnection, VoiceConnectionStatus.Ready, 20 * 1000);
		} catch (error) {
			console.warn(error);
			await chatChannel.send('Failed to join voice channel within 20 seconds, please try again later!');
			return;
		}

		try {
			// Attempt to create a Track from the user's video URL
			const track = await TrackFrom(url, {
				onStart() {
					console.log('Now playing!');//.catch(console.warn);
				},
				onFinish() {
					console.log('Now finished!');//.catch(console.warn);
				},
				onError(error) {
					console.warn(error);
					console.log(`Error: ${error.message}`);//.catch(console.warn);
				},
			});
			// Enqueue the track and reply a success message to the user
			subscription.enqueue(track);
			await console.log(`Enqueued **${track.title}**`);
		} catch (error) {
			console.warn(error);
			await chatChannel.send('Failed to play track, please try again later!');
		}
}

function musicSkip(message){
  if (subscription) {
			// Calling .stop() on an AudioPlayer causes it to transition into the Idle state. Because of a state transition
			// listener defined in music/subscription.ts, transitions into the Idle state mean the next track from the queue
			// will be loaded and played.
			subscription.audioPlayer.stop();
			console.log('Skipped song!');
		} else {
			console.log('Not playing in this server!');
	}
}

function musicQueue(message){
  // Print out the current queue, including up to the next 5 tracks to be played.
		if (subscription) {
			const current =
				subscription.audioPlayer.state.status === AudioPlayerStatus.Idle
					? `Nothing is currently playing!`
					: `Playing **${(subscription.audioPlayer.state.resource).metadata.title}**`;

			const queue = subscription.queue
				.slice(0, 5)
				.map((track, index) => `${index + 1}) ${track.title}`)
				.join('\n');

			console.log(`${current}\n\n${queue}`);
		} else {
			console.log('Not playing in this server!');
		}
}

function musicPause(message){
  if (subscription) {
			subscription.audioPlayer.pause();
			console.log('Paused!');
		} else {
			console.log('Not playing in this server!');
		}
}

function musicResume(message){
  if (subscription) {
			subscription.audioPlayer.unpause();
			console.log(`Unpaused!`);
		} else {
			console.log('Not playing in this server!');
	}
}

function musicLeave(message){
  if (subscription) {
			subscription.voiceConnection.destroy();
			console.log(`Left channel!`);
		} else {
			console.log('Not playing in this server!');
	}
}

module.exports = {
  //variable: variable,
  musicPlay: musicPlay,
  musicSkip: musicSkip,
  musicQueue: musicQueue,
  musicPause: musicPause,
  musicResume: musicResume,
  musicLeave: musicLeave
  // exportsに設定しない限り_f()は呼べない
}