const dgram = require('dgram');
const server = dgram.createSocket('udp4');

server.on('error', (err) => {
    console.log(`server error:\n${err.stack}`);
    server.close();
});

server.on('message', async (msg, rinfo) => {
    console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`);

    switch (msg.toString()){
        case 'unpause':
            if(dispatcher != null && dispatcher.paused)
            {
                dispatcher.resume();
                console.log('Resuming (iOS)');
                if(latestMessage != null){
                    latestMessage.channel.send('Resuming cuz Siri told me to');
                }
            }
            break;

        case "pause":
            pauseVideo();
            break;

        case "skip":
            if(dispatcher != null && !dispatcher.paused)
            {
                console.log('Skipping');
                if(latestMessage != null){
                    latestMessage.channel.send('Skipping cuz Siri told me to');
                }
                stopVideo();
            }
            break;

        case "stop":
            queue = []; //clear queue
            console.log('Stopping');
            stopVideo();
            break;

        default: //query
            if(queue.length == 0) //empty queue
            {
                let response = await getResponse(query);
                queue.push(response);
                playVideo(response);
                if(latestMessage != null){
                    latestMessage.channel.send("Playing " + response.data.items[0].snippet.title + "because Siri told me to");
                }
            }
            else { //non-empty queue
                let response = await getResponse(query);
                queue.push(response);
                console.log("Queuing song, queue length: " + queue.length);
                if(latestMessage != null){
                    latestMessage.channel.send("Siri told me queue " + response.data.items[0].snippet.title);
                }
            }
            break;
    }
});

server.on('listening', () => {
    const address = server.address();
    console.log(`server listening ${address.address}:${address.port}`);
});

exports.server = server;