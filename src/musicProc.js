const ytdl = require('ytdl-core');
const { MusicSubscription } = require('./music/subscription.js');
const { Track, TrackFrom } = require('./music/track.js');
const { entersState, AudioPlayerStatus, VoiceConnectionStatus, createAudioPlayer, createAudioResource, joinVoiceChannel,  StreamType, NoSubscriberBehavior } = require('@discordjs/voice');

var subscription;

async function musicPlay(message){
  // メッセージから動画URLだけを取り出す
  const url_ = message.content.split(' ')[1];
  let url;
  if(url_.match('^h?ttps?://www.youtube.com/watch')){
    if (url_.charAt(0) === 't') url = 'h' + url_.split('&')[0];
    else url = url_.split('&')[0];
  } else if(url_.match('^h?ttps?://youtu.be/')){
    if (url_.charAt(0) === 't') url = 'h' + url_.split('?')[0];
    else url = url_.split('?')[0];
  }
  console.log(url);
  if (!ytdl.validateURL(url)) return message.reply(`${url}は処理できません。`);
  // コマンドを実行したメンバーがいるボイスチャンネルを取得
  const channel = message.member.voice.channel;
  // コマンドが実行されたテキストチャンネルを取得
  const chatChannel = message.channel;
  // コマンドを実行したメンバーがボイスチャンネルに入ってなければ処理を止める
  if (!channel) return message.reply('先にボイスチャンネルに参加してください！');
  
		// If a connection to the guild doesn't already exist and the user is in a voice channel, join that channel
		// and create a subscription.

		if (!subscription) {
      const connection = joinVoiceChannel({
					channelId: channel.id,
					guildId: channel.guild.id,
			  	adapterCreator: channel.guild.voiceAdapterCreator,
          selfDeaf: true,
          selfMute: false,
				});
			subscription = new MusicSubscription(
				connection
			);
			subscription.voiceConnection.on('error', console.warn);
      console.log(subscription.voiceConnection._events.error);
    }
		// Make sure the connection is ready before processing the user's request
    subscription.registerMessage(message);
		try {
			await entersState(subscription.voiceConnection, VoiceConnectionStatus.Ready, 20 * 1000);
		} catch (error) {
			console.warn(error);
			await chatChannel.send('Failed to join voice channel within 20 seconds, please try again later!');
			return;
		}

		try {
			// Attempt to create a Track from the user's video URL
			TrackFrom(url, {
				onStart() {
				  console.log('Now playing!');
				},
				onFinish() {
					console.log('Now finished!');
				},
				onError(error) {
					console.warn(error);
					chatChannel.send(`Error: ${error.message}`);
				},
			})
			// Enqueue the track and reply a success message to the user
			.then(track => {subscription.enqueue(track);/* chatChannel.send(`Enqueued **${track.title}**`)*/;})
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
			message.channel.send('Skipped song!');
		} else {
			message.reply('Not playing in this server!');
	}
}

function musicQueue(message){
  // Print out the current queue, including up to the next 5 tracks to be played.
		if (subscription) {
			const current =
				(subscription.audioPlayer.state.status === AudioPlayerStatus.Idle && subscription.audioPlayer.state.resource !== undefined)
					? `Nothing is currently playing!`
					: `Playing **${(subscription.audioPlayer.state.resource).metadata.title}** \`[${(subscription.audioPlayer.state.resource).metadata.duration}]\``;

			const queue = subscription.queue
				.slice(0, 5)
				.map((track, index) => `\`${index + 1}) [${track.duration}]\` ${track.title}`)
				.join('\n');
      
      message.channel.send(`${current}\n\n${queue}`);
      /*message.channel.send({embeds: [{
        fields: [{value: `${current}\n\n${queue}`}]
      }]});*/
		} else {
			message.reply('Not playing in this server!');
		}
}

async function musicPause(message){
  if (subscription && subscription.audioPlayer.state.resource !== undefined) {
			subscription.audioPlayer.pause();
			message.reply(`⏸ **${(subscription.audioPlayer.state.resource).metadata.title}**`);
        } else {
			message.reply('Not playing in this server!');
		}
}

function musicResume(message){
  if (subscription && subscription.audioPlayer.state.resource !== undefined) {
			subscription.audioPlayer.unpause();
			message.reply(`▶️ **${(subscription.audioPlayer.state.resource).metadata.title}**`);
		} else {
			message.reply('Not playing in this server!');
	}
}

function musicLeave(message){
  if (subscription) {
      musicDestroy(message.client);
			console.log(`Left channel!`);
		} else {
			message.reply('Not playing in this server!');
	}
}

function musicDestroy(client){
  if(subscription){
    subscription.voiceConnection.destroy();
    subscription = undefined;
    const musicChannelid = client.channels.cache.filter((channel)=> channel.id === process.env.MUSIC_TEXTCHANNEL_ID).first();
    musicChannelid.send('The queue has been cleared!');
  }
}

module.exports = {
  musicPlay: musicPlay,
  musicSkip: musicSkip,
  musicQueue: musicQueue,
  musicPause: musicPause,
  musicResume: musicResume,
  musicLeave: musicLeave,
  musicDestroy: musicDestroy
}