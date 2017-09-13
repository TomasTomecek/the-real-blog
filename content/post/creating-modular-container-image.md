---
title: "Building container image with modular OS from scratch"
date: 2017-09-13T16:27:47+02:00
draft: false
---

We were sitting at "Modularity UX feedback" session at Flock 2017. Sinny Kumari
raised an interesting question: "Can I create a container image with modular OS
locally myself?". Sinny wanted to try the modular OS on different CPU
architectures.

The container image can be created using Image Factory, which can be really
tough to set up.

<!--more-->

I'm so glad that platform team already solved this problem during development
of Boltron in their GitHub repo
[fedora-modularity/baseruntime-docker-tests](https://github.com/fedora-modularity/baseruntime-docker-tests).

They created a neat way of creating a docker base image from scratch using mock.

In order to do this, you should follow the instructions from
[README](https://github.com/fedora-modularity/baseruntime-docker-tests#package-setup)
of the repo. Before running `avocado run setup.py`, we need to change configuration
of mock because by default it uses Boltron (F26) repos and targets x86\_64.

I did this on my Raspberry Pi. The configuration is present in
[resources/base-runtime-mock.cfg](https://github.com/fedora-modularity/baseruntime-docker-tests/blob/master/resources/base-runtime-mock.cfg):

 1. I targeted arm CPU architecture:
  ```diff
  -config_opts['target_arch'] = 'x86_64'
  -config_opts['legal_host_arches'] = ('x86_64',)
  +config_opts['target_arch'] = 'armhfp'
  +config_opts['legal_host_arches'] = ('armhfp', 'armv7l' )
  ```

 2. I used Modular Rawhide compose repo:
  ```diff
  -baseurl=https://kojipkgs.fedoraproject.org/compose/latest-Fedora-Modular-26/compose/Server/x86_64/os/
  +baseurl=https://kojipkgs.fedoraproject.org/compose/latest-Fedora-Modular-Rawhide/compose/Server/armhfp/os/
  ```

Modular dnf is still not available in mainline. Martin is providing the RPM via
his COPR repo
[mhatina/DNF-Modules](https://copr.fedorainfracloud.org/coprs/mhatina/DNF-Modules/).
The important note is that the modular DNF is only available for architectures
`x86_64`, `i386` and `ppc64le`.

Let's build the image!

```
$ sudo python2 ./setup.py
...
Successfully built dac3c6598bef

command  'docker rmi base-runtime-smoke-scratch' succeeded with output:
Untagged: base-runtime-smoke-scratch:latest

PASS 1-./setup.py:BaseRuntimeSetupDocker.testCreateDockerImage

Test results available in /tmp/avocado_avocado.core.jobwv6R1t
```

Once the build is done, we can try it out:

```
$ sudo docker run --rm -ti base-runtime-smoke-scratch:latest bash

bash-4.4# cat /etc/system-release
Fedora modular release 27 (Twenty Seven)

bash-4.4# uname -i
armv7l
```

Once the patches for modular DNF are in mainline, this will be a lot more interesting!
