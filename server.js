const http = require('http');
const querystring = require('querystring');
const Canvas = require('canvas')
const discord = require('discord.js');
const cmdProc = require('./cmdProc.js');
const { Client, Intents, MessageAttachment } = require('discord.js');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES] });

http.createServer(function(req, res){
  if (req.method == 'POST'){
    var data = "";
    req.on('data', function(chunk){
      data += chunk;
    });
    req.on('end', function(){
      if(!data){
        res.end("No post data");
        return;
      }
      var dataObject = querystring.parse(data);
      console.log("post:" + dataObject.type);
      if(dataObject.type == "wake"){
        console.log("Woke up in post");
        res.end();
        return;
      }
      res.end();
    });
  }
  else if (req.method == 'GET'){
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Discord Bot is active now\n');
  }
}).listen(3000);

client.on('ready', () =>{
  console.log('Bot準備完了～');
  client.user.setPresence({ activity: { name: 'げーむ' } });
  //const musicChannelID = client.channels.cache.filter((channel)=> channel.id === process.env.MUSIC_TEXTCHANNEL_ID).first();
  //musicChannelID.send('Bot再起動〜');
});

client.on('messageCreate', message =>{
  if (message.author.bot){
    return;
  }
  if (message.content.startsWith('!')){
    cmdProc.cmdProcedure(message);
    return;
  }
  //const notifChannelID = client.channels.cache.filter((channel)=> channel.id === '863697257584656389').first();
  //if(notifChannelID !== undefined)notifChannelID.send('メッセージ');
  if(message.mentions.users.has(client.user)) {
    message.reply("呼びましたか？");
    return;
  }
  if (message.content.match(/にゃ～ん|にゃーん/)){
    message.channel.send("にゃ〜ん");
    return;
  }
});

client.on('voiceStateUpdate', async (oldState, newState) =>{
  const gulid = newState.guild;
  if(newState.channel !== oldState.channel){
    const notifChannelID = client.channels.cache.filter((channel)=> channel.id === process.env.NOTIF_TEXTCHANNEL_ID).first();
    if(oldState.channel === null){
      //console.log("voiceState");
      if(newState.channel.id === gulid.afkChannelId)return;
      if(newState.member.user.bot === true)return;
      console.log(newState.channel.id);
      console.log(gulid.afkChannelId);
      notifChannelID.send(newState.member.displayName + " が「" + newState.channel.name +"」に入室しました！\n");
      //console.log(userIconsVoiceCh(newState.channel).length);
      const activeVoiceCh = gulid.channels.cache.filter(c => c.type === 'GUILD_VOICE' && c.members.size !== 0).size;
      console.log(activeVoiceCh);
      for(let i = 0; i < activeVoiceCh; i++){
        const currentChannel = gulid.channels.cache.filter(c => c.type === 'GUILD_VOICE' && c.members.size !== 0).at(i);
        notifChannelID.send({content: "現在「" + currentChannel.name +"」"+  currentChannel.members.size + "人\n", files: [{attachment: await userIconsVoiceCh(currentChannel)}]});
      }
      //notifChannelID.send(userIconsVoiceCh(newState.channel));
    }else if(newState.channel === null){
      if(gulid.channels.cache.filter(c => c.type === 'GUILD_VOICE' && memberSizeExceptBot(c) === true).size === 0 && oldState.channel.id !== gulid.afkChannelId){
        if(gulid.channels.cache.filter(c => c.type === 'GUILD_VOICE' && c.members.size !== 0).size === 0)notifChannelID.send("いまは誰も入室してないよー\n");
        cmdProc.DestroyMusicBotConnection(client);
      }
      //notifChannelID.send("<@" + newState.id +"> が通話を終了しました！\n");
      //notifChannelID.send(oldState.channel.members.size + "人\n");
    }
  }
  //client.channels.cache.get(863697257584656388).send('メッセージ');
});

function memberSizeExceptBot(channel){
  const memsize = channel.members.size;
  if(memsize === 0)return false;
  else if(memsize <= process.env.MusicBot_num){
    for (let i = 0; i < memsize; i++){
      if(channel.members.at(i).user.bot === false)return true;
    }
    return false;
  }
  else return true;
}

async function userIconsVoiceCh(voiceCh){
  let userSize = voiceCh.members.size;
  if(userSize === 0)return null;
  const canvas = Canvas.createCanvas(29 * userSize - 5, 24);
  const ctx = canvas.getContext('2d');
  ctx.beginPath();
  for(let i = 0; i < userSize; i++){
    createRoundRectPath(ctx, 29 * i, 0, 24, 24, 3);
  }
  ctx.closePath();
  ctx.clip();
  for(let i = 0; i < userSize; i++){
    const pfp = await Canvas.loadImage(
      voiceCh.members.at(i).displayAvatarURL({
        size:128, format: 'png',
      })
    )
    const posx = 29 * i;
    ctx.drawImage(pfp, 0, 0, 128, 128, posx, 0, 24, 24);
  }
  //const attachment = new MessageAttachment(canvas.toBuffer());
  //console.log(attachment.height);
  return canvas.toBuffer();
}

function createRoundRectPath(ctx, x, y, w, h, r) {
    //ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arc(x + w - r, y + r, r, Math.PI * (3/2), 0, false);
    ctx.lineTo(x + w, y + h - r);
    ctx.arc(x + w - r, y + h - r, r, 0, Math.PI * (1/2), false);
    ctx.lineTo(x + r, y + h);       
    ctx.arc(x + r, y + h - r, r, Math.PI * (1/2), Math.PI, false);
    ctx.lineTo(x, y + r);
    ctx.arc(x + r, y + r, r, Math.PI, Math.PI * (3/2), false);
    //ctx.closePath();
}

if(!process.env.DISCORD_BOT_TOKEN){
 console.log('DISCORD_BOT_TOKENが設定されていません。');
 process.exit(1);
}

client.login( process.env.DISCORD_BOT_TOKEN );