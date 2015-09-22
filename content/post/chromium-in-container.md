+++
tags = ["docker", "linux"]
date = "2015-03-27T00:00:00+02:00"
title = "Running chromium in docker container"

+++

I've just managed to dockerize chromium. The package itself is taken from [spot](https://fedoraproject.org/wiki/User:Spot)'s [copr](https://copr.fedoraproject.org/coprs/spot/chromium/) repo. [Jessie Frazelle's blog post](https://blog.jessfraz.com/posts/docker-containers-on-the-desktop.html) helped me a lot!

It looks like this:

<!--more-->

![Chromium in a docker container](https://raw.githubusercontent.com/TomasTomecek/dockerfile-fedora-chromium/master/chromium-in-container.png)

You can get it either from docker hub, or build it yourself.


## Docker hub

    % docker pull tomastomecek/fedora-chromium

And run it:

    % docker run \
        --net host \
        -v /tmp/.X11-unix:/tmp/.X11-unix \
        -e DISPLAY=$DISPLAY \
        -e XAUTHORITY=/.Xauthority \
        -v ~/.Xauthority:/.Xauthority:ro \
        --name chromium \
        tomastomecek/fedora-chromium


## Build it yourself

    % docker build --tag=fedora-chromium .


For more information, see [the github repo](https://github.com/TomasTomecek/dockerfile-fedora-chromium).

