+++
tags = ["docker"]
date = "2016-08-04T10:36:39+02:00"
draft = false
title = "Handling secrets when building docker images is easy"

+++

So you wanna build a docker image. And you need to fetch your application sources from git. Which is guarded by `ssh`. And you don't want the ssh key to get leaked into the final image. Bummer.

Unless...

<!--more-->


This is the Dockerfile. As you can see, we clone with `ssh://`:

```
FROM fedora

COPY id_rsa /root/.ssh/
RUN dnf install -y git python3-setuptools python3-urwid
RUN git clone ssh://github.com:TomasTomecek/sen && \
    cd sen && \
    python3 ./setup.py install && \
    rm -rf /root/.ssh/id_rsa  # remove the key, we don't want to share with the world
CMD ["sen"]
```

Important line is:

```
rm -rf /root/.ssh/id_rsa
```

as we we don't want to share the key with the world. (and we think this will work)

We can build now:

```
$ docker build --tag=sen .
...
Successfully built 2256d1ba4421
```

Let's see if we can access the private key:

```
$ mkdir image/
$ docker save sen | tar -x -C image/
$ cd image/
$ find . -name "*.tar" -exec tar -t -f {} \; | grep id_rsa
root/.ssh/id_rsa
```


Whoops! Our **private** key leaked! We need to fix this...

...by squashing layers!!

```
$ docker-squash -f f9873d530588 -t squashed-sen sen
```

(use `docker history` to find out the layer id you want to squash from)

Let's see if the key is present in the squashed image:

```
$ rm -rf ./image/*
$ find . -name "*.tar" -exec tar -t -f {} \; | \
    grep id_rsa || \
    echo "You're safe"
You're safe
```

This is how you can easily solve secrets when building docker images.

Here's [docker-squash](https://github.com/goldmann/docker-squash). Thanks Marek for writing the tool!

