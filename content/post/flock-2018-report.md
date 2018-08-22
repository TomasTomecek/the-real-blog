+++
date = "2018-08-22T10:30:30+02:00"
title = "Flock 2018 trip report"
draft = false
tags = ["Flock", "Fedora", "containers"]
+++

Thank you for the contributions and review, Dominika and Jirka.


## Fedora and CentOS will be closer
A presentation from Jim Perrin and Matt Miller revealed that Fedora and CentOS
dist-git will be tied together. This change will likely provide an opportunity
to do crazy, awesome and beautiful stuff. But the key thing is to have a single
dist-git deployment instead of 2 at start. Once that’s done, we may start
thinking about what to do with it.

<!--more-->

Also Brian Stinson described the CI effort to validate all Fedora packages
using CentOS CI infrastructure. Good updates, we seem to be getting really
close to a system where all of us can write tests for their packages easily and
run them on builds. Brian promised that short term we should be getting
notifications from the pipeline and documentation. Can’t wait!

## Modularity
Modularity keeps on rockin’. Now’s the time to become a moduler (module
packager, the term invented by Ralph) and start adding content to Fedora. Even
Matt said he wants more modules.

## Fedora CoreOS
It’s alive! [The proof is this Fedora CoreOS PRD](https://fedoraproject.org/wiki/CoreOS/PRD).

The plan is to sunset Fedora atomic host in F30 and move to Fedora CoreOS then.
The engineering teams are being established and the work is being started.

Dusty Mabe and Benjamin Gilbert had an insightful presentation about Fedora
Atomic Host and CoreOS Container Linux. Lots of technical details and lessons
learnt. I suggest watching this one offline if you missed it. Probably my most
favorite flock talk.

## Flatpaks
Owen did a tremendous amount of work on building flatpaks in Fedora infra. I
still can’t process how he was able to pull that off. [The guide is over here](https://fedoraproject.org/wiki/Workstation/Flatpaks).
Here’s how it works:

1. Define a module (yeah, like a module module) using modulemd.
  * Pick RPMs to put in your flatpak.
  * Depend on flatpak runtime.
2. Request a build.
  * Which generates a dockerfile on the fly.
  * And submits the build to OSBS.

I find this absolutely amazing that we can reuse the vast content of Fedora in
flatpaks and no need to pull the content from upstream and compile it from
scratch (what flatpak builder does).

## Rawhide
Kevin Fenzi talked about rawhide. Nice overview describing past, present and
future.

The future is really promising (validation, gating, automatic bodhi updates,
bodhi side tags). I hope we’ll get there.

## Fedora containers
This was one of the reasons we went to Flock — to discuss state and future of
Fedora container images.

The main outcome is that we kicked off Fedora containers SIG (thanks to Clement
who did all the work actually). Wanna see our progress? Or even, wanna join us?
Here are some handy links:

* `ENTRYPOINT https://fedoraproject.org/wiki/Container_SIG`
* `LABEL com.redhat.component=https://pagure.io/ContainerSIG/container-sig`
* `LABEL description=https://fedoraproject.org/wiki/Container_SIG/Flock2018-notes`

And Clement even scheduled [the first SIG meeting](https://discussion.fedoraproject.org/t/container-sig-initial-irc-meeting-august-23-2018-15-00-utc-on-fedora-containers/258)!

Here are the key areas of focus in the SIG

* Easy maintenance of container images
  * Right now it’s pretty hard, daunting and unclear
* Move to quay.io
* Multiarch images
* Automation (bodhi, linting, testing, building & updating)
  * Related to the first one
* Source of truth for container guidelines and best practices - https://github.com/user-cont/colin

Action items for our team, user-cont:

* Figure out what to do with github.com/container-images
  * Including the template, probably donate it Fedora (github.com/container-images/container-image-template)
* Open source bots
  * Target running them in Fedora openshift (requires openshift templates and ansible to deploy)

## Fedora messaging
Fedora infrastructure team introduced new fedmsg architecture. Messages will be published using AMQP brokers (rabbitmq instead of zeromq) and will be validated by sender and receiver.

More info: https://fedora-messaging.readthedocs.io/en/latest/

There will be time when both systems will be available.
