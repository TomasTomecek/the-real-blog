+++
date = "2015-10-27T14:29:33+01:00"
draft = true
title = "build docker engine in fedora"

+++

It's not that hard, here are a couple pain points:

 * **make sure that `GOPATH` is right** — you want to compile against your checked out docker, not master docker
```
└── src
    └── github.com
        └── docker
            └── docker -> git/docker
```

 * **compile `dynbinary`, not `binary`** — otherwise you'll get
```
/usr/lib/golang/pkg/tool/linux_amd64/link: running gcc failed: exit status 1
/bin/ld: cannot find -ldevmapper
```

 * **get all system dependencies** — this will change in future (inspired by [Pavel Odvody's Dockerfile](https://github.com/shaded-enmity/docker-build-fedora/blob/master/Dockerfile))
```
btrfs-progs-devel
curl
gcc
git
golang
lvm2-devel
sqlite-devel
ca-certificates
e2fsprogs
iptables
xz-devel
lxc
glibc-static
device-mapper-devel
device-mapper-event-devel
libblkid-devel
lvm2
lvm2-libs
pkgconfig
libgudev1-devel
```

 * **get all go dependencies** (can this be done with `godep`?)
```
$ go get ./...
```

 * **create `autogen/dockerversion`**
```
$ bash hack/make/.go-autogen
```

And final command to make all happen:

```
$ GOPATH="$PWD/vendor:$GOPATH" ./hack/make.sh dynbinary
```

Run it locally:

```
$ sudo bundles/latest/dynbinary/docker daemon -D -H unix://$PWD/docker.sock -p ./docker.pid
```

Access from client:

```
$ sudo bundles/latest/dynbinary/docker -H unix://$PWD/docker.sock ps -a
```
