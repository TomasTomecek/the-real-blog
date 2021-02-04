---
title: "Sharing audio to a videoconference using pulseaudio"
date: 2021-02-04T10:51:09+01:00
draft: false
---

Since I do all the meetings via videoconferencing software in this pandemic,
from time to time I need to do something extra than just sharing my face and
voice: *share a video from my laptop*.

Luckily, pulseaudio has your backs, it's just not *that* trivial.

Before we start, I suggest to read these posts how to share sound and hear it
in your headphones:

* [github.com/toadjaune/pulseaudio-config](https://github.com/toadjaune/pulseaudio-config)
* [How can I use PulseAudio virtual audio streams to play music over Skype?](https://askubuntu.com/questions/257992/how-can-i-use-pulseaudio-virtual-audio-streams-to-play-music-over-skype)
* [Share an audio playback stream through a live audio (video) conversation like Skype](https://askubuntu.com/questions/421014/share-an-audio-playback-stream-through-a-live-audio-video-conversation-like-sk)

This blog post serves as a TL;DR version for me how to do the easy version:
only share the audio to the meeting without being able to hear it.

First thing to do is to create a `null-sink` where we pipe the audio:

```sh
pactl load-module module-null-sink sink_name=virtual1 sink_properties=device.description="video"
```

Now we need to make sure that our player sends the sound to the "video" sink via `pavucontrol`:

![VLC pipues the output to the video sink](/img/player-to-video-sink.png)

We're half-way there! Now we just plug the other side of the "video" sink to
the videoconference. In my case, it would be gmeet running in chromium:

![Video sync to conference](/img/video-to-conf.png)

One note here: some videoconf software allows you to change streams via its
application interface, this applies for Google Meet and Bluejeans. So if this
doesn't work, try setting "video.monitor" as your microphone in the interface
of the application.

This is it, pretty easy in the end. The main problem with this simple setup is
that you cannot hear the sound from the video, though this is the tradeoff. If
you wanna hear it, look the links above and try the more complicated setup
which mirrors the video sound to the conference and to your headphones.

Good luck!

Tomas

