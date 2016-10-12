+++
date = "2016-10-10T16:28:44+02:00"
tags = ["containers", "linux"]
draft = false
title = "LinuxCon ContainerCon Europe 2016"
+++

Here are my assorted notes from some `${subject}` talks.

<!--more-->

(Blame me, not speakers, for any untruths in these notes.)


## Keynote: Incremental Revolution - What Docker Learned from the Open-Source Fire Hose - Solomon Hykes, Founder, CTO and Chief Product Officer, Docker
 * Incremental revolution
 * Tools of mass innovation
 * [Similar to a DockerCon 2015 keynote]
 * Programmable internet would be a tool of mass innovation
 * Docker is building a stack: standards → infra → dev platform → product
 * Docker is 250 people
 * With open source they get a lot of contributions
 * Borrowed some open source rules form Linux kernel
 * Linux started with plumbing, Docker started with the product
  * Plumbing along the way
 * Docker is solving problems
  * e.g. Docker for Mac, Docker for AWS
 * Demo
  * [showcases docker on Mac]
  * [showcases docker on AWS - clicky interface]
 * Infrakit - new open source project
  * [was opensourced live]
  * [for more info see notes below]


## Putting the Parts Together: Building a Secure Container Platform - Matthew Garrett, CoreOS

 * Multilayer security: container → runtime → kernel → firmware
  * You need to secure lower layer b/c upper layer trusts the lower layer implicitly
 * [Uses Fedora!!! A lot of CoreOS folks do]
 * UEFI Secure boot
  * First level of protection: signed bootloaded
 * Signed kernel, baked initrd into kernel
 * [IMA](https://sourceforge.net/p/linux-ima/wiki/Home/)
  * Kernel has a list of files and their hashes and verifies that the file (executable) matches its hash
  * Makes sure that no one tampered your files
  * Hash is stored in extended attribute
 * [EVM](https://wiki.gentoo.org/wiki/Extended_Verification_Module)
  * Verify that selected set of extended security attributes wasn't changed
 * [dm-verity](https://source.android.com/security/verifiedboot/dm-verity.html) (by google for chrome os)
  * Hash tree which validates whole filesystem
  * The tree contains hashes of blocks, not the whole block device
  * Read only filesystem
  * Enabled in CoreOS, root hash is stored in signed kernel
 * The above implies immutable base system
 * Where to store trusted keys required for signed container images?
  * Immutable kernel keyring
  * Populated during boot time and made immutable
   * In UEFI variables (are signed)
 * Per container SELinux isolation
 * Clear containers: run production containers in lightweight VMs
 * Live introspection (theoretical research)
  * The future
  * Reduces performance significantly


## Building Distributed Systems without Docker, Using Docker Plumbing Projects - Patrick Chanezon & David Chung, Docker & Phil Estes, IBM

 * OCI / runc is getting addoption
  * [runv](https://github.com/hyperhq/runv) is hypervisor based runtime for [Hyper.sh](https://www.hyper.sh/), fully compatible with OCI
  * [Garden](https://www.cloudfoundry.org/garden-and-runc/), runtime for Cloud Foundry, [will use runc](https://github.com/hyperhq/runv) as a backend for linux
  * Intel has their [own implementation](https://github.com/01org/cc-oci-runtime) of OCI runtime spec for clear containers
 * containerd uses shim process to enable process reparenting
  * And thus enable live reload of containerd without restarting containers
 * [InfraKit](https://github.com/docker/infrakit)
  * Newly introduced as a open source project to create and manage a declarative, self-healing infrastructure
 * Declarative json config: images, groups, flavors, instance types, sizes...
 * Config is the input
 * Self healing
  * Monitoring infra state
  * Detect state divergence
  * Take actions
 * No downtime, rolling update
 * Primitives, abstractions: create, scale, group, instance, ...
 * Instance plugins for EC2, Azure, Vagrant, ...


## Locking Down Your Systemd Services - Lennart Poettering, Red Hat

This talk was about sandboxing and security features of systemd (existing,
planned). Lennart presented a list of configuration options available for
services (unit files):

 * `DynamicUser` - transient user: created when service starts, removed once service is stoppped
 * `CapabilityBoundingSet` - maximal set of ever available capabilities to the process tree - process will never ever be able to obtain capabilities which are not in this set
 * `PrivateTmp` - `/tmp` is shared for all processes; this option provides private `/tmp` dir to the service as `/tmp`, it's removed when the service is stopped (on host this dir is available as a subdir of `/tmp`)
 * `PrivateDevices` - no access to privileged devices (e.g. `/dev/sda`)
 * `PrivateNetwork` - creates new network stack for the service and populates only `localhost` interface, rest of the network is unavailable
 * `ProtectSystem` - set parts of the filesystem read only: `/boot`, `/usr`, `/etc` or even `/`
 * `PrivateUsers` - disconnected user databases, most of the users are mapped to `nobody` user; only root user and service's user are mapped correctly
 * `ReadWritePaths` - list of paths which the service is expected to read and write into
 * `ReadOnlyPaths` - list of paths which the service is expected to read only
 * `InaccessiblePaths` - list of paths which the service should not be able to access

Example:

```
$ systemd-run -p InaccessiblePaths=/etc/passwd -p ReadOnlyPaths=/etc -p PrivateTmp=true -t bash
Running as unit: run-u1282.service
Press ^] three times within 1s to disconnect TTY.
```

We can't read `/etc/passwd`:

```
bash-4.3# ls -lha /etc/passwd
---------- 1 0 root 0 Oct  4 14:41 /etc/passwd
bash-4.3# cat /etc/passwd
bash-4.3# 
```

We can't write to `/etc/`:

```
bash-4.3# echo "asdqwe" >/etc/asdqwe
bash: /etc/asdqwe: Read-only file system
```

We have our own private `/tmp`:

```
bash-4.3# ls -lha /tmp
total 4.0K
drwxrwxrwt   2 0 root   40 Oct 12 14:52 .
dr-xr-xr-x. 21 0 root 4.0K Jul 29 16:42 ..
```

