const http = require('http');
const querystring = require('querystring');
const Canvas = require('canvas')
const discord = require('discord.js');
const { Client, Intents } = require('discord.js');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES] });
//const notifChannelID = client.channels.cache.filter((channel)=> channel.id === '863697257584656389').first();

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
});

client.on('messageCreate', message =>{
  if (message.author.bot){
    return;
  }
  const notifChannelID = client.channels.cache.filter((channel)=> channel.id === '863697257584656389').first();
  if(notifChannelID !== undefined)notifChannelID.send('メッセージ');
  if(message.mentions.users.has(client.user)) {
    message.reply("呼びましたか？");
    return;
  }
  if (message.content.match(/にゃ～ん|にゃーん/)){
    message.channel.send("にゃ〜ん");
    return;
  }
});

client.on('voiceStateUpdate', (oldState, newState) =>{
  if(newState.channel !== oldState.channel){
    const notifChannelID = client.channels.cache.filter((channel)=> channel.id === '863697257584656389').first();
    if(oldState.channel === null){
      //console.log("voiceState");
      notifChannelID.send(newState.member.displayName + " が「" + newState.channel.name +"」に入室しました！\n");
      notifChannelID.send({content: newState.channel.members.size + "人\n", files: [newState.member.displayAvatarURL({size:16})]});
      //const attachment = new discord.MessageAttachment('cbcfilter.png');
    }else if(newState.channel === null){
      notifChannelID.send("<@" + newState.id +"> が通話を終了しました！\n");
      notifChannelID.send(oldState.channel.members.size + "人\n");
    }
  }
  //client.channels.cache.get(863697257584656388).send('メッセージ');
});

function userIconsVoiceCh(voiceCh){
  let userSize = voiceCh.members.size;
  if(userSize === 0)return null;
  const canvas = Canvas.createCanvas(29*userSize - 5, 24);
  const ctx = canvas.getContext('2d');
}

if(!process.env.DISCORD_BOT_TOKEN){
 console.log('DISCORD_BOT_TOKENが設定されていません。');
 process.exit(1);
}

client.login( process.env.DISCORD_BOT_TOKEN );