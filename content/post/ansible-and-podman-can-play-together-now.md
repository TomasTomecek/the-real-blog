---
title: "Ansible and Podman Can Play Together Now"
date: 2018-11-01T20:49:23+01:00
draft: false
tags: ["ansible", "linux", "podman"]
---

[Sam Doran just merged](https://github.com/ansible/ansible/pull/47519) my pull request which introduces a new connection plugin
for [podman](https://github.com/containers/libpod). If you are not sure what an Ansible connection plugin is, hold
tight and I'll show you.

The connection plugin is the component which enables Ansible to execute
commands in a target environment: you are probably mostly familiar with these
two:

 * **ssh** — managing remote machines
 * **local** — executing a playbook in the current environment

Since Ansible abstracts this mechanic very well, you can easily write
connection plugins for such a thing as container managers. Ansible has one for
docker and some time ago [I wrote one for buildah](https://github.com/ansible/ansible/pull/26170). I concluded it's time to
write it for podman as well, finally (so I can utilize it in [ansible-bender](https://github.com/TomasTomecek/ansible-bender)).

<!--more-->


### How is this useful?

Just as I said, you can write a playbook and execute it in a podman container.
E.g. you can update your containers. Let's try to do it.

We'll run a podman container first.

```
$ podman pull registry.fedoraproject.org/fedora:29
$ podman run -d --name container registry.fedoraproject.org/fedora:29 sleep infinity
```

Don't forget that you *do not* need to be root to create a podman container.

Let's update that container now with Ansible.

```
$ cat playbook.yml
- hosts: all
  connection: podman
  tasks:
  - dnf:
      state: latest
```

```
$ cat inv
container ansible_connection=podman ansible_python_interpreter=/usr/bin/python3
```

Everything's prepared, let's do it!
```
$ ansible-playbook -i inv ./playbook.yml

PLAY [all] *****************************************************************************************

TASK [Gathering Facts] *****************************************************************************
ok: [container]

TASK [dnf] *****************************************************************************************
ok: [container]

PLAY RECAP *****************************************************************************************
container                  : ok=2    changed=0    unreachable=0    failed=0    skipped=0
```

Easy, right? That's Ansible.


The thing I'm going to use that plugin for is to build container images: write
an Ansible playbook to define a container image, execute it, commit the
container and that's it: no dockerfiles, no bash, just Ansible.

If this interests you, please check out
[ansible-bender](https://github.com/TomasTomecek/ansible-bender) or
[ansible-container](https://github.com/ansible/ansible-container).


### And how can I use that plugin right now?

I'll be honest. I lied a bit with the command which invokes the playbook.
You'll be able to use that command once Ansible 2.8 comes out. In the meantime,
you can utilize that plugin directly from git — to play with it, don't use it
for anything serious.

We'll clone devel branch of Ansible first:
```
$ git clone https://github.com/ansible/ansible -b devel ./my-ansible
Cloning into './my-ansible'...
remote: Enumerating objects: 204, done.
remote: Counting objects: 100% (204/204), done.
remote: Compressing objects: 100% (165/165), done.
remote: Total 371584 (delta 156), reused 39 (delta 39), pack-reused 371380
Receiving objects: 100% (371584/371584), 134.01 MiB | 2.30 MiB/s, done.
Resolving deltas: 100% (236688/236688), done.
```

Now we can invoke the playbook (I am running this on Fedora 29 using python3).
```
$ PYTHONPATH=./my-ansible/lib/ python3 ./my-ansible/bin/ansible-playbook -i inv ./playbook.yml

PLAY [all] *****************************************************************************************

TASK [Gathering Facts] *****************************************************************************
ok: [container]

TASK [dnf] *****************************************************************************************
ok: [container]

PLAY RECAP *****************************************************************************************
container                  : ok=2    changed=0    unreachable=0    failed=0    skipped=0
```

Kudos to [Matt Martz](https://github.com/sivel) for helping me navigate that PR.


Happy hacking!

