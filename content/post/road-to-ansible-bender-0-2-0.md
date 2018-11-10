---
title: "Road to ansible-bender 0.2.0"
date: 2018-11-09T18:03:02+01:00
draft: false
tags: ["ansible", "containers", "buildah", "linux", "podman"]
---

I'm pleased to announce that
[ansible-bender](https://github.com/TomasTomecek/ansible-bender) is now
available in version `0.2.0`.

<!--more-->

I would like to share a story with you how I used ansible-bender to release the
`0.2.0` version.

In our team at Red Hat, we developed a bot to aid us with releasing our
upstream projects: [release-bot](https://github.com/user-cont/release-bot). The
bot is able to release to Github, PyPI and Fedora. All you need to do is to
create a new Github issue and that's it — the bot would take care of the rest.

Naturally, what I wanted to do was to deploy the bot so that it would release
ansible-bender. [@kosciCZ](https://github.com/kosciCZ), our intern, did a very good job on how people are
meant to use and deploy release-bot — using [s2i](https://github.com/openshift/source-to-image). You just create a new git
repo, put your configuration in it and do `s2i build` to have an image with
your custom release-bot. Sadly I'm terribly OCD and I need to build everything
from scratch myself: so I went ahead and build a container image with
release-bot on my own.

Did I start by writing a dockerfile?

Nope! I wrote a playbook and built the image using ab itself.


## The playbook, take 1

```
---
- name: this playbook is meant to populate a container image
  hosts: all
  vars:
    bot_installation: 'git+https://github.com/user-cont/release-bot.git'
    # bot_installation: 'release-bot'
  tasks:
  - name: install required packages
    dnf:
      name: ['python3-pip', 'git', 'python3-twine', 'python3-pyyaml', 'twine']
      state: present
  - name: install release bot
    pip:
      name: '{{ bot_installation }}'
      state: present
  - name: ensure release-bot is installed
    command: release-bot --help
  - name: copy config file
    copy:
      src: conf.yaml
      dest: /conf.yaml
  - name: copy pypirc
    copy:
      src: pypirc
      dest: ~/.pypirc
  - name: copy github app cert
    copy:
      src: bot-certificate.pem
      dest: /bot-certificate.pem
```

Let's talk about the playbook briefly:

 * First we install all the dependencies from Fedora repositories.
 * Then we install release-bot from master branch.
 * Finally, we copy configuration files to expected locations.


## The playbook, take 2

It took me actually some time to have the playbook you see above. In this
release of ansible-bender I added a few features which help you with
development of new playbooks:

1. You can stop loading from cache in any task.

2. You can disable creation of new layers in any task.

3. If the build fails, the image is committed for your later inspection.


So how does these help?

The first feature allows you to load expensive actions from cache (such as
package installations) and at the same time keep executing tasks even when a
task content is the same, such as cloning git repositories. That's exactly what
I was doing: keep changing content of a git branch while the task itself was
the same. When I faced this situation with dockerfiles, I kept adding no-op
operations to the RUN instructions which I wanted to re-exec. With
ansible-bender, you only need to add tag `no-cache`.

When you disable caching for a part of your playbook, usually you don't need
layering any more right? This speeds up the build a bit since ab doesn't need
to commit and create new containers for every task. Just add a tag
`stop-layering` to a task and it's done.

The third feature is self-explanatory. If you perform an expensive action and
it fails, it may be desirable to hop inside the container and see what went
wrong: performing the action again sounds like a waste of time and resources.

Time to improve our playbook then.
```
---
- name: this playbook is meant to populate a container image
  hosts: all
  vars:
    bot_installation: 'git+https://github.com/user-cont/release-bot.git'
    # bot_installation: 'release-bot'
  tasks:
  - name: install required packages
    dnf:
      name: ['python3-pip', 'git', 'python3-twine', 'python3-pyyaml', 'twine']
      state: present
  - name: install release bot
    pip:
      name: '{{ bot_installation }}'
      state: present
    tags:
    - 'no-cache'
  - name: ensure release-bot is installed
    command: release-bot --help
  - name: copy config file
    copy:
      src: conf.yaml
      dest: /conf.yaml
    tags: [stop-layering]
  - name: copy pypirc
    copy:
      src: pypirc
      dest: ~/.pypirc
  - name: copy github app cert
    copy:
      src: bot-certificate.pem
      dest: /bot-certificate.pem
```

Let's use it to build a container image using ansible-bender:
```
$ ab build ./build_recipe.yml registry.fedoraproject.org/fedora:29 release-bot-ab

PLAY [this playbook is meant to populate a container image] *****************************************

TASK [Gathering Facts] ******************************************************************************
ok: [release-bot-ab-20181110-132800551894-cont]

TASK [install required packages] ********************************************************************
changed: [release-bot-ab-20181110-132800551894-cont]
caching the task result in an image 'release-bot-ab-20182910-132941'

TASK [install release bot] **************************************************************************
detected tag 'no-cache': no cache loading from now
changed: [release-bot-ab-20181110-132800551894-cont]
caching the task result in an image 'release-bot-ab-20183010-133011'

TASK [ensure release-bot is installed] **************************************************************
changed: [release-bot-ab-20181110-132800551894-cont]
caching the task result in an image 'release-bot-ab-20183010-133040'

TASK [copy config file] *****************************************************************************
changed: [release-bot-ab-20181110-132800551894-cont]
detected tag 'stop-layering', tasks won't be cached nor layered any more

TASK [copy pypirc] **********************************************************************************
changed: [release-bot-ab-20181110-132800551894-cont]

TASK [copy github app cert] *************************************************************************
changed: [release-bot-ab-20181110-132800551894-cont]

PLAY RECAP ******************************************************************************************
release-bot-ab-20181110-132800551894-cont : ok=7    changed=6    unreachable=0    failed=0

Getting image source signatures
Skipping fetch of repeat blob sha256:482c4d1bda84fe2df0cb5efb4c85192268ed46b79052c9e03ce2091e1ea010bf
Skipping fetch of repeat blob sha256:07432c540f7e1b8b975fe0d7c2168023df2ac89ab3b4bfa495c9e42984000e6e
Copying blob sha256:5d5032c00c1a125d71c03448b67f208bbe8f0530b9da5667b3221961277f4af5

 0 B / 1.74 KiB [--------------------------------------------------------------]
 1.74 KiB / 1.74 KiB [======================================================] 0s
Copying config sha256:021f4df16157f5d98774e197f37b2174015f7af98fa25305d9a99f44ea6f5673

 0 B / 672 B [-----------------------------------------------------------------]
 672 B / 672 B [============================================================] 0s
Writing manifest to image destination
Storing signatures
021f4df16157f5d98774e197f37b2174015f7af98fa25305d9a99f44ea6f5673
Image 'release-bot-ab' was built successfully \o/
```

And when we rerun the build, package installation is loaded from cache while
the task when the bot is being installed is actually performed again:
```
$ ab build ./build_recipe.yml registry.fedoraproject.org/fedora:29 release-bot-ab

PLAY [this playbook is meant to populate a container image] *****************************************

TASK [Gathering Facts] ******************************************************************************
ok: [release-bot-ab-20181110-134828482424-cont]

TASK [install required packages] ********************************************************************
loaded from cache: 'eaff56b73bc767db67362e67560d0ffe0546afabea9223ae2172811baf314d58'
skipping: [release-bot-ab-20181110-134828482424-cont]

TASK [install release bot] **************************************************************************
detected tag 'no-cache': no cache loading from now
changed: [release-bot-ab-20181110-134828482424-cont]
caching the task result in an image 'release-bot-ab-20184810-134847'

TASK [ensure release-bot is installed] **************************************************************
changed: [release-bot-ab-20181110-134828482424-cont]
caching the task result in an image 'release-bot-ab-20184810-134856'

TASK [copy config file] *****************************************************************************
changed: [release-bot-ab-20181110-134828482424-cont]
detected tag 'stop-layering', tasks won't be cached nor layered any more

...
```


## Conclusion

With those two ansible tags, it was very efficient for me to develop the playbook.

Can't wait to use ab more for my other projects in future.

At the same time, ab is very fresh and probably not bug-free (I use it, there
is a solid test suite but I can't catch everything). While I was writing this
blog post, I discovered two bugs which I fixed just now and am about to roll
out `0.2.1`.

So if you run into some strange behavior, please report it.


Happy hacking!

