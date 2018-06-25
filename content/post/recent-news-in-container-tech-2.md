+++
date = "2018-06-21T08:57:59+02:00"
title = "Recent news in container tech: issue 2"
draft = false
tags = ["containers", "linux", "fedora"]

+++

This is an issue number 2 of what's happening in the world of linux containers.
We have 2 items on the menu for today:

1. Kata containers 1.0
2. Buildah 1.0

<!--more-->

## Kata containers 1.0

[Kata containers](https://katacontainers.io/) is a project which was created by
merging [Clear Containers](https://clearlinux.org/containers) and
[hyper.sh](https://www.itnews.com.au/news/intel-hypersh-merge-tech-into-kata-containers-479193).
The project is essentially about utilizing user interface and image format of linux
containers (OCI/runc) and launching the service in a VM, not a linux container.
All of this happens wicked fast:
```
$ time docker run -m 256m busybox ls
bin
dev
etc
home
proc
root
sys
tmp
usr
var
real    0m2.402s
```

2 seconds to launch a VM, that's awesome. And it would be even faster if this wasn't nested virtualization.

I'm running my demo using Fedora on host and Fedora 28 cloud VM. Kata
containers has pretty good [docs](https://github.com/kata-containers/documentation) on how to set it up. Let's go one step
further and automate it using Vagrant and Ansible. Both the [Vagrantfile](/etc/Vagrantfile) and
[ansible playbook](/etc/provision.yml) are available on this site. Please bear in mind that your
host OS needs to support nested virtualization:
```
cat /sys/module/kvm_intel/parameters/nested
Y
```

[Here are docs for Fedora](https://docs.fedoraproject.org/quick-docs/en-US/using-nested-virtualization-in-kvm.html) how to enable it.


Once you downloaded both files locally, let's just run `vagrant up` and
`vagrant ssh`. Once that's done, we can launch some ~~container~~ VM:
```
[root@localhost ~]# docker pull busybox
[root@localhost ~]# docker run -m 256m -ti busybox sh
/ #
/ #
/ #
/ #
/ #
/ # uname -a
Linux e5e7cff87092 4.14.22-130.1.container #1 SMP Tue Jun 12 05:41:34 UTC 2018 x86_64 GNU/Linux
[root@localhost ~]# uname -a
Linux localhost.localdomain 4.16.3-301.fc28.x86_64 #1 SMP Mon Apr 23 21:59:58 UTC 2018 x86_64 x86_64 x86_64 GNU/Linux
```

As you can see, both are using a different kernel, so it got to be a VM in a VM.

Let's observe the qemu process running the VM:
```
[root@localhost ~]# docker run -d -m 256m -ti busybox sh
5b26962274a099ca9536ecda00ae05b63402f5e4589535f98fa875e1dd4e1239
[root@localhost ~]# ps aux | grep qemu
root     20508  8.0  5.6 1214184 115884 ?      Sl   08:14   0:01 /usr/bin/qemu-lite-system-x86_64 -name sandbox-5b26962274a099ca9536ecda00ae05b63402f5...
```

That's it for Kata.


## Buildah 1.0

The second item is also a 1.0 release. And it's buildah, the low-level tool to create container images.

The team behind buildah writes some really awesome blog posts and I don't want to dupe those over here, so feel free to read:

* [A daemon-haunted (container) world no longer: Introducing Buildah 1.0 ](https://www.redhat.com/en/blog/daemon-haunted-container-world-no-longer-introducing-buildah-10)
* [Getting Started with Buildah ](https://www.projectatomic.io/blog/2017/11/getting-started-with-buildah/)
* [Buildah - build your containers from the ground up! ](https://www.projectatomic.io/blog/2017/06/introducing-buildah/)
* [Troubleshooting a Buildah script](https://opensource.com/article/18/6/buildah-troubleshooting)

I would like to point out two things about buildah in this post:

1. You can still use dockerfiles and buildah will create your container image just fine.
    ```
    $ sudo buildah bud --tag a-web-app .
    STEP 1: FROM registry.fedoraproject.org/fedora:27
    Getting image source signatures
    Copying blob sha256:7d9785054c83b88ddeb0e679fb2ea45223214366d3d9c60b47cec010125dc7aa
     80.70 MiB / 80.70 MiB [====================================================] 9s
    Copying config sha256:801894bc0e43e5e9897ffdf247be9edd32f98ed438730b172658f88b1fd956be
     1.27 KiB / 1.27 KiB [======================================================] 0s
    Writing manifest to image destination
    Storing signatures
    STEP 2: LABEL name="a-web-app"
    STEP 3: LABEL version="0"
    STEP 4: ARG USER_ID=1000
    STEP 5: RUN dnf install -y krb5-workstation python3-dbus libgnome-keyring python3-gobject
    Fedora 27 - x86_64 - Updates                    6.6 MB/s |  24 MB     00:03
    Fedora 27 - x86_64                              7.4 MB/s |  58 MB     00:07
    Dependencies resolved.
    ================================================================================
     Package                 Arch   Version               Repository           Size
    ================================================================================
    Installing:
     krb5-workstation        x86_64 1.15.2-9.fc27         updates             912 k
     libgnome-keyring        x86_64 3.12.0-10.fc27        fedora              114 k
     python3-gobject         x86_64 3.26.1-1.fc27         updates              23 k
    Installing dependencies:
     aajohan-comfortaa-fonts noarch 3.001-1.fc27          fedora              147 k
     cairo                   x86_64 1.15.10-1.fc27        updates             713 k
     cairo-gobject           x86_64 1.15.10-1.fc27        updates              31 k
     file                    x86_64 5.31-11.fc27          updates              72 k
    ...
    ```

2. You can populate the container image while running on host. This is so
   powerful! You can easily start from scratch (=empty container) and
   start shoving in only the content you need in your container image:
    ```
    $ sudo buildah from scratch
    working-container

    $ sudo buildah mount working-container
    /var/lib/containers/storage/overlay/034a9cc9195d750721f3c9b033b4fa6e46e335d8bb75b0e928643bd1b902bb7f/merged

    $ ll /var/lib/containers/storage/overlay/034a9cc9195d750721f3c9b033b4fa6e46e335d8bb75b0e928643bd1b902bb7f/merged
    total 0
    ```

    It's indeed empty. Let's start populating:
    ```
    $ sudo dnf install \
        --installroot /var/lib/containers/storage/overlay/034a9cc9195d750721f3c9b033b4fa6e46e335d8bb75b0e928643bd1b902bb7f/merged \
        bash
    Dependencies resolved.
    ===========================================================
     Package                       Arch           Version      
    ===========================================================
    Installing:
     bash                          x86_64         4.4.23-1.fc29
    Installing dependencies:
     basesystem                    noarch         11-5.fc28    
     fedora-gpg-keys               noarch         29-0.5       
     fedora-release                noarch         29-0.4       
     fedora-repos                  noarch         29-0.5       
     fedora-repos-rawhide          noarch         29-0.5       
     filesystem                    x86_64         3.8-3.fc28   
    ...
    ```
    As you can see, we invoked dnf on our host and we decided which precise RPM packages will be in our image.


That's it for today, thanks for reading!

