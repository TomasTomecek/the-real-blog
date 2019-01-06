---
title: "Ansible-bender in OKD"
date: 2018-12-30T14:07:28+01:00
draft: false
tags: ["ansible", "linux", "containers"]
---

### Intro
For the past couple of months, I've been working on a project we call "Ansible
OCI image builder". I named the tool itself [ansible-bender](https://github.com/TomasTomecek/ansible-bender) (and yes, it’s
shiny).

<!--more-->

### Current status
I'm using it almost for 2 months now. There are some bumps
[here](https://github.com/TomasTomecek/ansible-bender/issues/21) and
[there](https://github.com/containers/buildah/issues/1225) but overall it
feels pretty solid. The best thing is that I can write Ansible to define my
container images.

Therefore I decided it's time to move to the next stage -- orchestrating builds
in your cluster. This means that I started integrating ansible-bender into
openshift. I chose to take the easy path by utilizing
[`customStrategy`](https://docs.openshift.com/container-platform/3.9/dev_guide/builds/build_strategies.html#custom-strategy-options)
type for the builds.

The main problem I ran into was that `buildah` did not work smoothly in an
openshift pod. I was constantly battling some (linux, capabilities, namespaces,
kernel) limitations. Here is a list of the most serious issues I encoutered:

* I was forced to use vfs graph backend because overlay filesystem does not
  work on top of overlay.
* Rootless is busted as well — the pod needs to have certain capabilities which
openshift drops by default. Therefore the pod is a privileged container.
* I ran into [this buildah
  issue](https://github.com/containers/buildah/issues/1251) which stopped my
  progress completely.
* And finally, since I still haven't figured out [a definition for
  metadata](https://github.com/TomasTomecek/ansible-bender/issues/10) of images
  (you need to pass opts to `ansible-bender build` now), it's not possible to
  set them.

Luckily enough, if you check master branch of origin you'll be able to see [a
bunch of commits related to
buildah](https://github.com/openshift/origin/search?p=1&q=buildah&type=Commits).
The most interesting part is that the storage of images is a volume so you are
able to use overlay as a backend. Overlay is much faster and efficient than
vfs. Since I decided to integrate ab using the custom builds I'm not able to
tinker with the configuration of pods. Probably a time to get some feedback
from the openshift devs.

### Next steps
Since [buildah#1251](https://github.com/containers/buildah/issues/1251) blocks
me, I need that one to be resolved as soon as possible so that I can keep on
moving. Once we have some successful builds we can start working on improving
the workflow and performance. One of the craziest ideas of mine is to make the
Ansible OCI image builder a dedicated build strategy. That would be a lot of
work, though.

I'm also planning to show ansible-bender at [devconf.cz](https://devconf.info/cz). My Talk is
scheduled for Friday, January 25th, 2019, around noon. Please stop by if you
want to hear more about building container images using ansible.

This is my update, let's celebrate New Year's Eve now.
