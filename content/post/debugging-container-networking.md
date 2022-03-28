---
title: "Debugging container networking: first steps"
date: 2022-03-24T08:00:00+01:00
draft: false
tags: ["containers", "networking"]
---

I blogged recently which means I need to do it again before another year of silence 😁

So... containers, we know them for years now but they still tend to cause us
problems thanks to the extra layers of abstraction, storage and... Networking.

<!--more-->

## Step 1: pin down the problem

As with any (networking) problem, we need to identify the root cause so we can start working on a solution. Saying
"networking isn't working" is not good enough, we need to be able to say
"[technology X] is causing [tool Y] misbehave because...".

Luckily in GNU/Linux, we have a ton of tools for investigation.


## Step 2: [is it DNS?](https://krisbuytaert.be/blog)

Since the container tooling mangles `/etc/hosts` and `/etc/resolv.conf`, DNS
can easily become broken in a container.

* Is `/etc/hosts` okay? You can compare with your host OS.
  Examples:
  ```
  $ cat /etc/hosts
  127.0.0.1   localhost localhost.localdomain localhost4 localhost4.localdomain4
  ::1         localhost localhost.localdomain localhost6 localhost6.localdomain6

  $ podman run --rm fedora:35 cat /etc/hosts
  127.0.0.1   localhost localhost.localdomain localhost4 localhost4.localdomain4
  ::1         localhost localhost.localdomain localhost6 localhost6.localdomain6
  # used by slirp4netns
  10.0.2.100      a7f239842c85 eloquent_ritchie
  10.0.2.2 host.containers.internal
  ```
  looks fine
* Does DNS actually work in a container?
  ```
  [root@74247f60f9d4 /]# getent hosts redhat.com
  10.4.204.55     redhat.com
  ```
  `getent` is directly using glibc, which is a great way to test
  DNS (you can [use `dig` as well](https://linux.die.net/man/1/dig))
* Let's see `/etc/resolv.conf` now:
  ```
  $ cat /etc/resolv.conf
  nameserver 127.0.0.53
  options edns0 trust-ad
  search redhat.com lan

  $ podman run --rm fedora:35 cat /etc/resolv.conf
  search redhat.com lan
  nameserver 10.0.2.3
  nameserver 192.168.1.1
  ```
So far so good.

## Step 3: ping?

The good ol' `ping 8.8.8.8`. Since we contact an IP address, DNS resolution is
not invoked.

```
$ podman run --rm fedora:35 ping 8.8.8.8
Error: executable file `ping` not found in $PATH: No such file or directory: OCI runtime attempted to invoke a command that was not found
```

Right.

```
$ podman run --rm fedora:35 bash -c "dnf install -y iputils && ping 8.8.8.8"
...
PING 8.8.8.8 (8.8.8.8) 56(84) bytes of data.
64 bytes from 8.8.8.8: icmp_seq=1 ttl=255 time=16.8 ms
64 bytes from 8.8.8.8: icmp_seq=2 ttl=255 time=16.1 ms
64 bytes from 8.8.8.8: icmp_seq=3 ttl=255 time=22.0 ms
64 bytes from 8.8.8.8: icmp_seq=4 ttl=255 time=15.7 ms
```

## Step 4: logs

*Should we have done this as a first step?*

Let's run `journalctl` as a root on the host:

```
# journalctl
Mar 24 12:28:42 cashew pensive_hawking[603998]: [354B blob data]
Mar 24 12:28:44 cashew pensive_hawking[603998]: [944B blob data]
Mar 24 12:28:45 cashew podman[603923]: 2022-03-24 12:28:45.15434599 +0100 CET m=+32.851896863 container kill bdbff9c3866b760ff3663a15e652e025faa4ff54036ef2e77e2990ba7af88ee2 (image=registry.fedoraproject.org/fedora:35...
Mar 24 12:28:51 cashew pensive_hawking[603998]: [4.9K blob data]
Mar 24 12:28:58 cashew pensive_hawking[603998]: [1.3K blob data]
Mar 24 12:29:01 cashew pensive_hawking[603998]: [2.0K blob data]
Mar 24 12:29:03 cashew pensive_hawking[603998]: [708B blob data]
Mar 24 12:29:06 cashew pensive_hawking[603998]: Dependencies resolved.
```

`pensive_hawking` is the name of my container.

Some breadcrumbs might be here as well but not this time.


## Step 5: inspect the container network

```
$ podman network ls
NETWORK ID    NAME        VERSION     PLUGINS
2f259bab93aa  podman      0.4.0       bridge,portmap,firewall,tuning
0b27c158feb3  kind        0.4.0       bridge,portmap,firewall,tuning,dnsname

$ podman network inspect podman
[
    {
        "cniVersion": "0.4.0",
        "name": "podman",
        "plugins": [
            {
                "bridge": "cni-podman0",
                "hairpinMode": true,
                "ipMasq": true,
                "ipam": {
                    "ranges": [
...
```

Another place where you can look for configuration.

## Step 6: fall back to `host`

If you haven't resolve it by this point, I'd suggest using `--network=host` and
see if using the host's network stack will resolve the problem:
```
$ podman run --rm --network=host fedora:35 ls -1 /sys/class/net
enp0s31f6
lo
tun0
wlp0s20f3

$ podman run --rm fedora:35 ls -1 /sys/class/net
lo
tap0
```

With `--network=host`, the container is using host's network stack instead of
bringing its own.


That's it. These are the first steps to do when networking is borked in your containers.

What tools and steps do you perform when networks don't behave in your containers?
