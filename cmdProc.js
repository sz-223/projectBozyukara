const ytdl = require('ytdl-core');
const { entersState, AudioPlayerStatus, createAudioPlayer, createAudioResource, joinVoiceChannel,  StreamType } = require('@discordjs/voice');

async function cmdProcedure(message){
  switch(message.content.split(' ')[0]){
    case '!play':
      if(!playMusicAnalyseURL(message))return;
      break;
    default:
      break;
  }
}

async function playMusicAnalyseURL(message){
  // メッセージから動画URLだけを取り出す
  const url = message.content.split(' ')[1];
  if (!ytdl.validateURL(url)) return message.reply(`${url}は処理できません。`);
  // コマンドを実行したメンバーがいるボイスチャンネルを取得
  const channel = message.member.voice.channel;
  // コマンドを実行したメンバーがボイスチャンネルに入ってなければ処理を止める
  if (!channel) return message.reply('先にボイスチャンネルに参加してください！');
  // チャンネルに参加
  const connection = joinVoiceChannel({
    adapterCreator: channel.guild.voiceAdapterCreator,
    channelId: channel.id,
    guildId: channel.guild.id,
    selfDeaf: true,
    selfMute: false,
  });
  const player = createAudioPlayer();
  connection.subscribe(player);
  const videoinfo = await ytdl.getInfo(ytdl.getURLVideoID(url));
  console.log("videoinfo.loudness");  
  console.log(videoinfo.player_response.playerConfig.audioConfig.loudnessDb);
  // 動画の音源を取得
  const stream = ytdl(ytdl.getURLVideoID(url), {
    filter: 'audioonly' && (format => format.audioCodec === 'opus' && format.container === 'webm'), //webm opus
    quality: 'highestaudio',
    highWaterMark: 32 * 1024 * 1024, // https://github.com/fent/node-ytdl-core/issues/902
  });
  const resource = createAudioResource(stream, {
    inputType: StreamType.WebmOpus,
    inlineVolume: true
  });
  const volumeconfigdB = 30 + videoinfo.player_response.playerConfig.audioConfig.loudnessDb;
  console.log(volumeconfigdB);
  console.log(Math.pow(0.1, volumeconfigdB / 20));
  resource.volume.setVolume(Math.pow(0.1, volumeconfigdB / 20));
  // 再生
  player.play(resource);
  await entersState(player,AudioPlayerStatus.Playing, 10 * 1000);
  await entersState(player,AudioPlayerStatus.Idle, 24 * 60 * 60 * 1000);
  // 再生が終了したら抜ける
  connection.destroy();
}
  
async function playMusic(){
}
  
module.exports = {
  //variable: variable,
  cmdProcedure: cmdProcedure,
  // exportsに設定しない限り_f()は呼べない
}