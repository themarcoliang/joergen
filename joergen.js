const fs = require('fs');
const Discord = require('discord.js');
const ytdl = require('ytdl-core');
const {google} = require('googleapis');
// const {authenticate} = require('@google-cloud/local-auth');

var keys = JSON.parse(fs.readFileSync('./keys.json'));
const TOKEN = keys.discord_token;
const YT_KEY = keys.yt_key;

const Youtube = google.youtube({
    version: 'v3',
    auth: YT_KEY
});
const client = new Discord.Client();

function playVideo(id, message){
    // console.log('videoId: ' + id);
    const channel = message.member.voice.channel;
    // const stream = ytdl('https://www.youtube.com/watch?v=' + id, {filter: 'audioonly'});
    
    channel.join().then((connection) => {
        const dispatcher = connection.play(ytdl('https://www.youtube.com/watch?v=' + id, {highWaterMark: 1<<25, filter: 'audioonly'}), {highWaterMark: 1});
        dispatcher.on('finish', ()=>{
            console.log('Finished playing');
            // dispatcher.destroy();
            channel.leave();
        });
        dispatcher.on('error', console.error);
    }).catch(function(err){
        console.error("Unexpected error with voice channel", err);
    });
    // dispatcher.destory();
}

client.on('ready', ()=> {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', function (msg) {
    const message = msg.content.toLowerCase();
    const split_message = message.split(' ');
    if(message.startsWith('joergen') && split_message.length > 1) //only care if message starts with joergen and has more than one word
    {
        if(!msg.member.voice.channel)
        {
            msg.reply('you must be in a voice channel to do that!');
            console.log('Failed to play: user not in a voice channel');
            return;
        }
        const arg = split_message.slice(1,2).join(' ');
        // console.log(arg);
        if(arg === 'play')
        {
            const query = split_message.slice(2).join(' ');
            return Youtube.search.list({
                        "part": "snippet",
                        "q" : query,
                        "type": "video",
                    }).then(function(response){
                        playVideo(response.data.items[0].id.videoId, msg);
                        msg.channel.send('Playing ' + response.data.items[0].snippet.title);
                    }).catch(function(err){
                        console.error("Unexpected error", err);
                    });
        }
        else if(arg == 'stop')
        {
            console.log('stopping');
        }

    }
});

client.login(TOKEN);