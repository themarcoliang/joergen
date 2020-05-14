# joergen
A private discord bot that automatically searches and plays youtube music based on user commands

Supported commands:
!play [query] : streams the requested video, or queues it if a song is already playing, query could be either a search term or link to youtube

!play : resumes player if paused, does nothing if player's not paused

!pause : pauses the player

!stop : clears the queue, stops the player, and exits the voice channel

!skip : skips current song, if nothing else is queued, bot leaves