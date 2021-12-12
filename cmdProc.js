const musicProc = require('./src/musicProc.js');

async function cmdProcedure(message){
  switch(message.content.split(' ')[0]){
    case '!play':
      if(!musicChannelCheck(message))return;
      if(!musicProc.musicPlay(message))return;
      break;
    case '!skip':
      if(!musicChannelCheck(message))return;
      if(!musicProc.musicSkip(message))return;
      break;
    case '!queue':
      if(!musicChannelCheck(message))return;
      if(!musicProc.musicQueue(message))return;
      break;
    case '!loop':
      if(!musicChannelCheck(message))return;
      if(!musicProc.musicLoop(message))return;
      break;
    case '!pause':
      if(!musicChannelCheck(message))return;
      if(!musicProc.musicPause(message))return;
      break;
    case '!resume':
      if(!musicChannelCheck(message))return;
      if(!musicProc.musicResume(message))return;
      break;
    case '!leave':
      if(!musicProc.musicLeave(message))return;
      break;
    default:
      break;
  }
}

function DestroyMusicBotConnection(client){
  musicProc.musicDestroy(client);
}

function musicChannelCheck(message){
  const musicChannel = message.client.channels.cache.filter((channel)=> channel.id === process.env.MUSIC_TEXTCHANNEL_ID).first();
  if(message.channel == musicChannel)return true;
  else {
    message.reply(`音楽botのコマンドは${musicChannel.name}チャンネルでのみ有効です！`);
    return false;
  }
}
  
module.exports = {
  //variable: variable,
  cmdProcedure: cmdProcedure,
  DestroyMusicBotConnection: DestroyMusicBotConnection,
  // exportsに設定しない限り_f()は呼べない
}