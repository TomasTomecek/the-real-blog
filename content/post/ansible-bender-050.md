---
title: "Ansible-bender reaches 0.5.0"
date: 2019-03-02T16:18:52+01:00
draft: false
tags: ["ansible", "linux", "containers"]
---

Exciting times! I just released `ansible-bender-0.5.0`.

This update contains [a ton of new
stuff](https://github.com/TomasTomecek/ansible-bender/releases/tag/0.5.0).
There is the one feature I am very proud of — configuring the build process by
using Ansible variables. Apart from that, I did a lot of bug fixes and
usability improvements.

<!--more-->

So with 0.5.0, you may get accustomed to use playbooks like these:
```yaml
---
- name: Demonstration of ansible-bender functionality
  hosts: all
  vars:
    ansible_bender:
      base_image: python:3-alpine

      working_container:
        volumes:
          - '{{ playbook_dir }}:/src'

      target_image:
        name: a-very-nice-image
        working_dir: /src
        labels:
          built-by: '{{ ansible_user }}'
        environment:
          FILE_TO_PROCESS: README.md
  tasks:
  - name: Run a sample command
    command: 'ls -lha /src'
  - name: Stat a file
    stat:
      path: "{{ lookup('env','FILE_TO_PROCESS') }}"

```

Just create the `ansible_bender` variable and set configuration and metadata of
the build process. No need to pass them via CLI.

Let's give it a shot:

```bash
$ ansible-bender build ./simple-playbook.yaml

PLAY [Demonstration of ansible-bender functionality] ****************************************

TASK [Gathering Facts] **********************************************************************
ok: [a-very-nice-image-20190302-153257279579-cont]

TASK [Run a sample command] *****************************************************************
changed: [a-very-nice-image-20190302-153257279579-cont]
caching the task result in an image 'a-very-nice-image-20193302-153306'

TASK [Stat a file] **************************************************************************
ok: [a-very-nice-image-20190302-153257279579-cont]
caching the task result in an image 'a-very-nice-image-20193302-153310'

PLAY RECAP **********************************************************************************
a-very-nice-image-20190302-153257279579-cont : ok=3    changed=1    unreachable=0    failed=0

Getting image source signatures

Skipping blob 767f936afb51 (already present): 4.46 MiB / 4.46 MiB [=========] 0s

Skipping blob b211a7fc6e85 (already present): 819.00 KiB / 819.00 KiB [=====] 0s

Skipping blob 8d092d3e44bb (already present): 67.20 MiB / 67.20 MiB [=======] 0s

Skipping blob 767f936afb51 (already present): 4.46 MiB / 4.46 MiB [=========] 0s

Skipping blob b211a7fc6e85 (already present): 819.00 KiB / 819.00 KiB [=====] 0s

Skipping blob 8d092d3e44bb (already present): 67.20 MiB / 67.20 MiB [=======] 0s

Skipping blob 492c5c55da84 (already present): 4.50 KiB / 4.50 KiB [=========] 0s

Skipping blob 6f55b6e55d8a (already present): 6.15 MiB / 6.15 MiB [=========] 0s

Skipping blob 80ea48511c5d (already present): 1021.00 KiB / 1021.00 KiB [===] 0s

Copying config 6b6dc5878fb2: 0 B / 5.15 KiB [----------------------------------]
Copying config 6b6dc5878fb2: 5.15 KiB / 5.15 KiB [==========================] 0s
Writing manifest to image destination
Storing signatures
6b6dc5878fb2c2c10099adbb4458c2fc78cd894134df6e4dee0bf8656e93825a
Image 'a-very-nice-image' was built successfully \o/
```

Are the metadata applied on the image?
```json
$ podman inspect a-very-nice-image
[
    {
        "Id": "5202048d9a0ee1d97de97c4e06efce175b4bf3af19d165c2f6e5eafe3af0550a",
        "Digest": "sha256:beb6296a905abfb54dce65194f2aed7a3a698f87cf20536cd7e2fdbb8b23d510",
        "RepoTags": [
            "localhost/a-very-nice-image:latest"
        ],
        "RepoDigests": [
            "localhost/a-very-nice-image@sha256:beb6296a905abfb54dce65194f2aed7a3a698f87cf20536cd7e2fdbb8b23d510"
        ],
        "Parent": "",
        "Comment": "",
        "Created": "2019-03-02T15:07:58.910406869Z",
        "Config": {
            "Env": [
                "PATH=/usr/local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
                "LANG=C.UTF-8",
                "GPG_KEY=0D96DF4D4110E5C43FBFB17F2D347EA6AA65421D",
                "PYTHON_VERSION=3.7.2",
                "PYTHON_PIP_VERSION=19.0.1",
                "FILE_TO_PROCESS=README.md"
            ],
            "Cmd": [
                "python3"
            ],
            "WorkingDir": "/src",
            "Labels": {
                "built-by": "tt"
            }
        },
```

I can see `"FILE_TO_PROCESS=README.md"` and `"built-by": "tt"`, all good.


Bite my shiny metal container!

