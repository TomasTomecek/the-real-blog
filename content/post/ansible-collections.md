---
title: "Ansible Collections: init"
date: 2020-05-05T09:45:50+02:00
draft: false
tags: ["Ansible", "Containers"]
---

[sshnaidm](https://github.com/sshnaidm) gave me an [opportunity](https://github.com/containers/ansible-podman-collections/pull/28#issuecomment-623404209) to play with Ansible Collections today.

Since I was at AnsibleFest 2019 in Atlanta, I heard so much about the collections but never actually used them.

<!--more-->

The first steps were really tough: I had no idea how to even start reviewing the PR and using it locally.

Luckily, Ansible has solid docs; these two were an immense help to me:

1. [Using collections](https://docs.ansible.com/ansible/latest/user_guide/collections_using.html)
2. [Developing collections](https://docs.ansible.com/ansible/latest/dev_guide/developing_collections.html#developing-collections)


### TL;DR

* `ansible-galaxy collection *` is the CLI interface

* all I did was to clone the repository and ran:
  ```
  $ ansible-galaxy collection build
  $ ansible-galaxy collection install containers-podman-0.2.0.tar.gz
  ```

* apparently `ansible-galaxy` just puts files and directories into a hierarchy:

  * `~/.ansible/collections/ansible_collections/containers/podman`

    * `containers` is a namespace
    * `podman` is the name of the collection

* you should be able to clone the repo in there directly (as [README of the collection suggests](/home/tt/.ansible/collections/ansible_collections/containers/podman))


## How did I review?

Well, I just used the buildah connection plugin from the collection:
```
---
- name: Test out the PR
  hosts: all
  connection: containers.podman.buildah
  vars: ...
```

But before running ansible-playbook, we need to create a buildah container:
```
$ buildah from fedora:32
fedora-working-container
```

And we also need to invoke ansible-playbook using `buildah unshare` so the mount command would work. Here we go:
```
$ buildah unshare ansible-playbook -i fedora-working-container, ./simple-playbook.yaml

PLAY [Test out the PR] ***************************************************************

TASK [Gathering Facts] ***************************************************************
ok: [fedora-working-container]

TASK [Run a sample command] **********************************************************
changed: [fedora-working-container]

PLAY RECAP ***************************************************************************
fedora-working-container   : ok=2    changed=1    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0
```

That's it, all good.

