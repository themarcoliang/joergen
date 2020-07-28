const ytdl = require('ytdl-core');

function sendToClient(text){
    console.log("Text to send: " + text);
}

function PlaySong(queue, audio_channel, text_channel, response){
    try{
        var id = response.data.items[0].id.videoId;
        var islive = response.data.items[0].snippet.liveBroadcastContent === 'live'; //check if requested video is a livestream, which uses a different ptag
        videoTitle = FilterTitle(response.data.items[0].snippet.title);
    }
    catch(error){
        console.error("Error in reading response", error);
        return -1;
    }
    return audio_channel.join().then(async(connection) => {
        var stream;
        var dispatcher;
        try{
            stream = ytdl('https://www.youtube.com/watch?v=' + id, 
            islive ? { quality: [128,127,120,96,95,94,93] } : {highWaterMark: 1<<25, filter: 'audioonly'});
        }
        catch(error){
            console.error("Error in creating stream", error);
            return -1;
        }
        try{
            dispatcher = await connection.play(stream, {highWaterMark: 1});
            console.log("Now Playing: " + videoTitle);
            text_channel.send("Ok, I'll play **" + videoTitle + "**");

            dispatcher.on('finish', ()=>{
                queue.shift(); //pops first item off
                console.log('Queue Length: ' + queue.length);
                if(queue.length == 0) //queue is empty
                {
                    playing = false;
                    sendToClient("Nothing");
                    console.log('Finished playing');
                    audio_channel.leave();
                }
                else //more songs to play
                {
                    console.log('Next song');
                    playVideo(queue[0]);
                }
            });

            return dispatcher;
        }
        catch(error){
            console.error("Error in playing stream", error);
            return -1;
        }
    })
}

function PauseSong(text_channel, dispatcher){
    if(dispatcher!=null)
    {
        dispatcher.pause();
        console.log('Pausing');
        text_channel.send("Ok, I'm pausing");
    }
    else{
        console.log("Request to pause ignored since nothing's playing");
    }
}

function StopSong(text_channel, dispatcher){
    if(dispatcher!=null)
    {
        dispatcher.end();
    }
}

function SkipSong(text_channel, dispatcher){
    console.log(dispatcher);
    if(dispatcher!=null && !dispatcher.paused)
    {
        StopSong(text_channel, dispatcher);
        text_channel.send("Okay, skipping song");
        console.log("Skipping");
    }
    else
    {
        console.log("Request to skip ignored since nothing's playing");
    }
}

function FilterTitle(title){
    var res = title.replace(/&#39;/gi, "'");
    res = res.replace(/&amp;/gi, "&");
	res = res.replace(/&quot;/gi, "\"");
    return res;
}

module.exports = {
    PlaySong, PauseSong, StopSong, SkipSong, FilterTitle, sendToClient
};