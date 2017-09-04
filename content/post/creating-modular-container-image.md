---
title: "Creating Modular Container Image"
date: 2017-08-31T16:27:47+02:00
draft: true
---

# Building container image with modular OS from scratch

We were sitting at "Modularity UX feedback" session at Flock 2017. Sinny Kumari
raised an interesting question: "Can I create a container image with modular OS
locally myself?". Sinny wanted to try the modular OS on different CPU
architectures.

The container image can be created using Image Factory, which can be really
tough to set up. So I figured out a different, simpler solution. Let's give it
a shot!

We need two things to create a container image from scratch:

1. package manager
2. content of the container image

Since we need modular content, we need dnf which supports management of
modules. The easiest way to have it is to use the one from James Antill's
latest modular container image. This is how you can get it:

```
$ docker pull docker.io/jamesantill/boltron-dnf-up
```

You should pick a directory on your host system where the resulting container
image will be stored, I'll put mine at `/tmp/container`.

Hence we'll run the boltron container like this:

```
$ docker run --rm -ti -v /tmp/container:/container docker.io/jamesantill/boltron-dnf-up bash
```

Here's our container:

```
[root@250f35de281b /]# 
```

Let's update dnf first so we have the latest version:

```
[root@f2d0f11ee574 /]# dnf update libdnf dnf -y
(1/4): Copr repo for DNF-Modules owned by mhatina                        54 kB/s |  45 kB     00:00
(2/4): Modularity repo for modular defaults on Boltron.                  37 kB/s |  46 kB     00:01
(3/4): Fedora Modular rawhide 26 - x86_64                               271 kB/s | 844 kB     00:03
(4/4): Fedora Modular 26 - x86_64                                       671 kB/s | 2.8 MB     00:04
Loading repositories.
Last metadata expiration check: 0:00:00 ago on Mon 04 Sep 2017 04:56:30 AM UTC.
Dependencies resolved.
========================================================================================================
 Package              Arch         Version                              Repository                 Size
========================================================================================================
Upgrading:
 dnf                  noarch       2.6.5-1.git.102.e0caca2.fc26         mhatina-DNF-Modules       389 k
 dnf-conf             noarch       2.6.5-1.git.102.e0caca2.fc26         mhatina-DNF-Modules       120 k
 libdnf               x86_64       0.9.5-1.git.1550.a77d036.fc26        mhatina-DNF-Modules       124 k
 python3-dnf          noarch       2.6.5-1.git.102.e0caca2.fc26         mhatina-DNF-Modules       538 k
 python3-hawkey       x86_64       0.9.5-1.git.1550.a77d036.fc26        mhatina-DNF-Modules        51 k

Transaction Summary
========================================================================================================
Upgrade  5 Packages

Total download size: 1.2 M

...

Upgraded:
  dnf.noarch 2.6.5-1.git.102.e0caca2.fc26              dnf-conf.noarch 2.6.5-1.git.102.e0caca2.fc26
  libdnf.x86_64 0.9.5-1.git.1550.a77d036.fc26          python3-dnf.noarch 2.6.5-1.git.102.e0caca2.fc26
  python3-hawkey.x86_64 0.9.5-1.git.1550.a77d036.fc26

Complete!
```

We can start populating our target container image which we have available
within our working container at `/container`.

Before we start, do you remember why Sinny wants this container?

Yes, she wants to try other architecture then `x86_64`. Let's pick ppc64le.

The command we'll use to install packages is this one:
```
dnf install --forcearch ppc64le --releasever 27 --installroot /container bash dnf python3-rpm
```

As you can see, the packages come from multiple repos, which seems like [a
bug](https://pagure.io/releng/issue/7008) in rawhide modular compose.

Once this is done, we can exit our working container and import the container into docker:

```
$ docker import /tmp/container | docker import fedora-modular-rawhide:ppc64le
```

At this point, you can create a repository at Docker Hub for your container
image and push the image in there, or use `docker save` and `docker load` to
transport the image as tarball to target system.
