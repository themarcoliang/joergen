const ytdl = require('ytdl-core');

function PlaySong(audio_channel, text_channel, response){
    try{
        var id = response.data.items[0].id.videoId;
        var islive = response.data.items[0].snippet.liveBroadcastContent === 'live'; //check if requested video is a livestream, which uses a different ptag
        videoTitle = FilterTitle(response.data.items[0].snippet.title);
    }
    catch(error){
        console.error("Error in reading response", error);
        return -1;
    }

    audio_channel.join().then((connection) => {
        var stream;
        try{
            stream = ytdl('https://www.youtube.com/watch?v=' + id, 
            islive ? { quality: [128,127,120,96,95,94,93] } : {highWaterMark: 1<<25, filter: 'audioonly'});
        }
        catch(error){
            console.error("Error in creating stream", error);
            return -1;
        }
        try{
            dispatcher = connection.play(stream, {highWaterMark: 1});
        }
        catch(error){
            console.error("Error in playing stream", error);
            return -1;
        }
        console.log("Now Playing: " + videoTitle);
        text_channel.send("Ok, I'll play **" + videoTitle + "**");

        return dispatcher;
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
        if(queue.length == 0)
        {
            console.log("Bot disconnecting");
            text_channel.send("Goodbye");
            // channel.leave();
        }
    }
}

function FilterTitle(title){
    var res = title.replace(/&#39;/gi, "'");
    res = res.replace(/&amp;/gi, "&");
	res = res.replace(/&quot;/gi, "\"");
    return res;
}

module.exports = {
    PlaySong, PauseSong, StopSong, FilterTitle
};