+++
date = "2018-05-10T09:39:15+02:00"
title = "Not so recent news in container tech"
draft = false
tags = ["containers"]

+++

I prepared a demo for my team with (not so) recent news in container tech I discovered. Here it is.

<!--more-->

## Unprivileged containers with `runc`

You can run containers using `runc` and not being root. Pretty cool, right?
[This was actually merged more than one year
ago](https://github.com/opencontainers/runc/pull/774).

Let's try it out! First we need a root filesystem:

```
$ mkdir rootfs
$ docker export $(docker create registry.fedoraproject.org/fedora:28) | tar -C rootfs -xf -
```

Now we need spec for runc:
```
$ runc spec --rootless
$ id
uid=1000(tt) gid=1000(tt) groups=1000(tt)
```

As you can see, I am using my unprivileged user.

Let's run it now:
```
$ runc run rootless-container
sh-4.4# id
uid=0(root) gid=0(root) groups=0(root),65534(nobody)
```

See, we got root inside the container. Unfortunately, `/etc/resolv.conf` is not populated by default. Just take the one from your host, shove it in the container, and you'll have a full internet access.
```
sh-4.4# vi /etc/resolv.conf

sh-4.4# getent hosts google.com
2a00:1450:4014:801::200e google.com

sh-4.4# dnf install tmux
Fedora 28 - x86_64 - Test Updates            57 MB/s |  17 MB     00:00
Fedora 28 - x86_64 - Updates                 37 MB/s | 6.0 MB     00:00
Fedora 28 - x86_64                           22 MB/s |  60 MB     00:02
Last metadata expiration check: 0:00:01 ago on Thu May 10 07:59:11 2018.
Dependencies resolved.
========================================================================
 Package  Arch           Version               Repository         Size
 =======================================================================
 Installing:
  tmux    x86_64         2.7-1.fc28            updates            316 k
```

Pretty neat, right?


## varlink interface for podman

[varlink](https://github.com/varlink) is a new protocol which enables tools and services to provide
universal API for multiple language ecosystems. [podman](https://github.com/projectatomic/libpod) [gained](https://github.com/projectatomic/libpod/search?q=is%3Apr+varlink&type=Issues) this API
recently. Let's give it a shot, shall we?

These are the packages you need:
```
# dnf install -y python3-varlink podman
```

I got these versions:
```
$  rpm -q podman python3-varlink
podman-0.5.2-2.gitfa4705c.fc29.x86_64
python3-varlink-22-1.fc29.noarch
```

One more prep step: podman's varlink interface creates a UNIX socket — we need to run a systemd service to make that happen:
```
# systemctl start io.projectatomic.podman.service
# systemctl status io.projectatomic.podman.service
● io.projectatomic.podman.service - Pod Manager
   Loaded: loaded (/usr/lib/systemd/system/io.projectatomic.podman.service; enabled; vendor preset: disabled)
   Active: active (running) since Thu 2018-05-10 10:11:58 CEST; 1s ago
 Main PID: 23943 (podman)
    Tasks: 9 (limit: 4915)
   Memory: 21.7M
   CGroup: /system.slice/io.projectatomic.podman.service
           └─23943 /usr/bin/podman varlink unix:/run/io.projectatomic.podman

May 10 10:11:58 oat systemd[1]: Started Pod Manager.
```

We can finally start now:
```
$ ipython3
In [1]: import varlink

In [2]: address = 'unix:/run/io.projectatomic.podman'

In [3]: client = varlink.Client(address=address)

In [4]: podman = client.open('io.projectatomic.podman')

In [5]: podman.ListImages()
Out[5]:
{'images': [{'id': '9110ae7f579f35ee0c3938696f23fe0f5fbe641738ea52eb83c2df7e9995fa17',
   'parentId': '',
   'repoTags': ['docker.io/library/fedora:27'],
   'repoDigests': ['docker.io/library/fedora@sha256:8f97ccd41222754a70204fec8faa07504f790454a22c888bd92f0c52463e0f3d'],
   'created': '2018-03-07 20:51:34.488688562 +0000 UTC',
   'size': 0,
   'virtualSize': 0,
   'containers': 0,
   'labels': {}},
  {'id': '8ac48589692a53a9b8c2d1ceaa6b402665aa7fe667ba51ccc03002300856d8c7',
   'parentId': '',
   'repoTags': ['docker.io/library/busybox:latest'],
   'repoDigests': ['docker.io/library/busybox@sha256:186694df7e479d2b8bf075d9e1b1d7a884c6de60470006d572350573bfa6dcd2'],
   'created': '2018-04-05 10:41:28.876407948 +0000 UTC',
   'size': 0,
   'virtualSize': 0,
   'containers': 0,
   'labels': {}},
  {'id': '3fd9065eaf02feaf94d68376da52541925650b81698c53c6824d92ff63f98353',
   'parentId': '',
   'repoTags': ['docker.io/library/alpine:latest'],
   'repoDigests': ['docker.io/library/alpine@sha256:8c03bb07a531c53ad7d0f6e7041b64d81f99c6e493cb39abba56d956b40eacbc'],
   'created': '2018-01-09 21:10:58.579708634 +0000 UTC',
   'size': 0,
   'virtualSize': 0,
   'containers': 0,
   'labels': {}}]}
```

That was nice. We can also inspect images:
```
In [6]: podman.InspectImage("docker.io/library/fedora:27")
Out[6]: {'image': '{"Id":"9110ae7f579f35ee0c3938696f23fe0f5fbe641738ea52eb83c2df7e9995fa17","Digest":"sha256:8f97ccd...
```

Unfortunately, [`PullImage` did not work](https://github.com/projectatomic/libpod/issues/743) and `CreateContainer` is not implemented, yet.


## Operator framework

Red Hat recently open sourced the Operator framework originally developed by CoreOS:

 * [Announcement](https://www.redhat.com/en/blog/introducing-operator-framework-building-apps-kubernetes)
 * [Getting started](https://github.com/operator-framework/getting-started)

Unfortunuately I did not have time to dig through.
