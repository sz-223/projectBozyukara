const musicProc = require('./src/musicProc.js');

async function cmdProcedure(message){
  switch(message.content.split(' ')[0]){
    case '!play':
      if(!musicProc.musicPlay(message))return;
      break;
    case '!skip':
      if(!musicProc.musicSkip(message))return;
      break;
    case '!queue':
      if(!musicProc.musicQueue(message))return;
      break;
    case '!pause':
      if(!musicProc.musicPause(message))return;
      break;
    case '!resume':
      if(!musicProc.musicResume(message))return;
      break;
    case '!leave':
      if(!musicProc.musicLeave(message))return;
      break;
    default:
      break;
  }
}

  
module.exports = {
  //variable: variable,
  cmdProcedure: cmdProcedure,
  // exportsに設定しない限り_f()は呼べない
}