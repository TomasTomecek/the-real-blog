+++
tags = ["fedora", "linux"]
date = "2016-08-12T11:00:00+02:00"
draft = false
title = "Flock 2016: my notes"

+++

Last week we were at Flock 2016 which was held in Krakow, Poland. Awesome
event, lots of news, great people, plenty of conversations and fun.

Here is a list of my notes:

<!--more-->


## Keynote

 * Fedora is growing
 * [Flatpak](http://flatpak.org/) is coming!
 * Fedora wants to focus on Atomic spin
 * Fedora is made by community (1/3 is Red Hat employees)


## Layered Image Build System in Fedora

 * Eventually will be feeding hub.docker.com/fedora
 * They will be getting [Fedora-Dockerfiles](https://github.com/fedora-cloud/Fedora-Dockerfiles) into dist-git
 * registry.fedoraprojrect.org is suppose to be behind mirror manager
 * Guidelines:
  * https://fedoraproject.org/wiki/PackagingDrafts/Package\_Review\_Process\_with\_Containers
  * https://fedoraproject.org/wiki/PackagingDrafts/Containers


## Getting new things into Fedora

 * Open
 * Reproducible
 * Auditable
 * tl;dr talk to people what you want to do, ideally as soon as possible


## Packaging chromium

 * Huge project, frequent releases, tons of code and contributors
 * Uses [GN](https://chromium.googlesource.com/chromium/src/+/master/tools/gn/docs/quick_start.md) as a build tool-chain
 * Downstream patches: rebasing is hard
 * Maintainers should upstream patches ASAP
 * Has team of maintainers in gentoo
 * Lot of bundled libs b/c they move too fast
 * Bundled dependencies are updated when the update is required, not when a new release is done


## Containers in production

 * It's all about building images
 * CoW issues: shared memory, overlay
 * Shared storage impossible to be done with CoW
 * CVEs
 * The team is planning to unpack docker images into an ostree repository
 * Simple image signing: one image can have multiple signatures
 * Remote image inspection: [skopeo](https://github.com/projectatomic/skopeo) -> [containers/image](https://github.com/containers/image)
 * CoW storage management tool: [containers/storage](https://github.com/containers/storage)
 * ocid - container management API
  * Implements k8s container runtime interface


## Modularity

 * Was super excited about this: Langdon delivered an awesome presentation
 * Workshop was also very active: everyone asked questions and tried to be part of the discussion
 * tl;dr modules are yum repos and they are built in a funky way in koji using custom tooling
 * It takes time to built even a simple module
 * AND IT WORKS!
 * https://fedoraproject.org/wiki/Modularity
