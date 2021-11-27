const http = require('http');
const querystring = require('querystring');
const discord = require('discord.js');
const { Client, Intents } = require('discord.js');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

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
  if(message.mentions.users.has(client.user)) {
    message.reply("呼びましたか？");
    return;
  }
  if (message.content.match(/にゃ～ん|にゃーん/)){
    message.channel.send("にゃ〜ん");
    return;
  }
});

if(!process.env.DISCORD_BOT_TOKEN){
 console.log('DISCORD_BOT_TOKENが設定されていません。');
 process.exit(1);
}

client.login( process.env.DISCORD_BOT_TOKEN );