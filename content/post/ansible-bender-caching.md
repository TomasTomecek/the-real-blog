---
title: "Caching mechanism in ansible-bender"
date: 2018-09-14T22:05:06+02:00
draft: false
tags: ["ansible-bender", "containers", "linux", "ansible"]
---

A few weeks ago [I announced](https://twitter.com/TomasTomec/status/1032973136210407424<Paste>) a new project — [ansible-bender](https://github.com/TomasTomecek/ansible-bender) (ab). It's a simple tool
to create container images using Ansible playbooks. The same concept as
[ansible-container](https://github.com/ansible/ansible-container), but ab is only about builds.

Ansible-bender utilizes an ansible connection plugin to invoke a playbook in a
container and [buildah](https://github.com/projectatomic/buildah) as the container technology.

Recently I was able to land a caching mechanism - every task result is being
cached. Since ansible doesn't allow doing such thing easily, it was quite a
feat.

<!--more-->

## How it's done?

On the other hand, ansible allows you to [write custom plugins](https://docs.ansible.com/ansible/2.5/dev_guide/developing_plugins.html) and modules to extend its
functionality: connection, caching, action, and the one I ended up using:
callback plugins.

Callback plugins are being invoked during a play: when a play starts, before a
task is executed, after the task finished and more. I used these last two
entrypoints to commit a container state after a task finished and load an image
if base image and task remained the same. No big deal, but ab now also has a
persistent database on disk (a json file) to track all builds. This will be
really handy when implementing commands such as: restart build, list builds,
get build logs and such.

You may be asking: when the plugin is invoked, how does the code figure out
what build it is? This was easily solved by an environment variable which holds
the build ID. The plugin code then tracks down the build in database and is
able to store the data about the cached item.

The caching support is in git master now, I still wanna test it a bit more
before releasing 0.2.0 out.

Here's how it looks:
```
$ ab build ./tests/data/basic_playbook.yaml python:3-alpine a-basic-image

PLAY [all] ******************************************************************************************

TASK [Gathering Facts] ******************************************************************************
ok: [a-basic-image-20180614-230625659538-cont]

TASK [print local env vars] *************************************************************************
loaded from cache: '56d49ac2a0f1cdf77ee3a4c0b9ceaece47dee81d1908b9917950d131ac29d29c'
skipping: [a-basic-image-20180614-230625659538-cont]
recording cache hit

TASK [print all remote env vars] ********************************************************************
loaded from cache: '57368def84d5bf6d6d29f3b0d8c565d1249c9df0b4e54679edc3501a07b90b34'
skipping: [a-basic-image-20180614-230625659538-cont]
recording cache hit

TASK [Run a sample command] *************************************************************************
loaded from cache: '8df0d25de40be31a910890fb93f2679593231cc801018e218abe12a426aa7497'
skipping: [a-basic-image-20180614-230625659538-cont]
recording cache hit

TASK [create a file] ********************************************************************************
loaded from cache: '27918a77ac6db100efecc114d5ed76a0ef5e9316bd4454b28bf8971b7205ad40'
skipping: [a-basic-image-20180614-230625659538-cont]
recording cache hit

PLAY RECAP ******************************************************************************************
a-basic-image-20180614-230625659538-cont : ok=1    changed=0    unreachable=0    failed=0

Getting image source signatures
Skipping fetch of repeat blob sha256:73046094a9b835e443af1a9d736fcfc11a994107500e474d0abf399499ed280c
Skipping fetch of repeat blob sha256:2e1059332702e87e617fe70be429c4f4d1b7c7ecfa06f898757889db9b4f7c1c
Skipping fetch of repeat blob sha256:fca20f9a2bbdd0460cb640e2c1c9b9f8f6736e0de3ad6af2e07102389ad8ba9a
Skipping fetch of repeat blob sha256:468ebd6ca830527febf2f900719becebd39e57912fad33bdb2934280d21b97dc
Skipping fetch of repeat blob sha256:252dff90bea0272a4a70ea641c572c712d0b8590e2a5f56eadcb3f215e46207d
Skipping fetch of repeat blob sha256:20504705b9487f5188cd6552c549a7085b4009296e521a4194d803ab2f526bac
Skipping fetch of repeat blob sha256:4f4fb700ef54461cfa02571ae0db9a0dc1e0cdb5577484a6d75e68dc38e8acc1
Copying config sha256:cee792679a80a8511e7acbf3f3ca4f71fb102481f86d49ad5a3481c35698e9b2

 0 B / 5.19 KiB [--------------------------------------------------------------]
 5.19 KiB / 5.19 KiB [======================================================] 0s
Writing manifest to image destination
Storing signatures
cee792679a80a8511e7acbf3f3ca4f71fb102481f86d49ad5a3481c35698e9b2
Image 'a-basic-image' was built successfully \o/
```

As you can see, every step was loaded from cache and hence the task itself was
skipped. Except for setup (`Gathering Facts`). This one is never cached.


## Conclusion

There is still room for improvements:

 * Controlling caching per task (e.g. never cache this).
 * Disable/enable caching.
 * Writing more tests.

I couldn't done this work without help of [Sviatoslav Sydorenko](https://github.com/webknjaz) — he helped me
out, when I asked: thank you!
