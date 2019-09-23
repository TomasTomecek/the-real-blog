---
title: "Building container images from scratch using Ansible"
date: 2019-09-23T19:48:11+02:00
draft: false
---

This blog post is a guide coming from [ansible-bender#49](https://github.com/ansible-community/ansible-bender/issues/49) issue.

Okay, let's start.

Building from scratch, what does it mean? It's very simple: your base image is an empty directory:

<!--more-->

```
$ buildah from scratch
working-container

$ mountpoint=$(buildah mount working-container)

$ ls -lha $mountpoint
total 0
drwxr-xr-x. 1 root root  6 Sep 23 19:55 .
drwx------. 6 root root 69 Sep 23 19:55 ..
```

If we want to use Ansible for all of this, we may need 2 plays:

1. A play to run on localhost which populates the container
2. A play which is executed inside the container (optional)

For the second one, we would need python or a shell inside the container. But
don't worry, we can install it using the first step. In the end it still
depends on your container image: you may not need to run commands within the
container env.

I am using Fedora OS all over the place, so in the first step, we'll install
python3 and bash Fedora packages inside the container using dnf, the Fedora OS
package manager.

Let's do that:
```
$ cat 1.yaml
---
- hosts: all
  tasks:
  - dnf:
      name:
      - python3
      - bash
      installroot: '{{ container_root }}'

$ ansible-playbook -c local -i localhost, -e container_root=$mountpoint -e ansible_python_interpreter=/usr/bin/python3 1.yaml

PLAY [all] *******************************************************************************************************

TASK [Gathering Facts] *******************************************************************************************
ok: [localhost]

TASK [dnf] *******************************************************************************************************
changed: [localhost]

PLAY RECAP *******************************************************************************************************
localhost                  : ok=2    changed=1    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0
```

(the need for the `ansible_python_interpreter` variable is that on Fedora,
`/usr/bin/python` points to python2 - and we want python3)

How does our container look now?
```
$ ls -lha $mountpoint
total 8.0K
dr-xr-xr-x.  1 root root  224 Sep 23 20:07 .
drwx------.  6 root root   69 Sep 23 19:55 ..
lrwxrwxrwx.  1 root root    7 Feb 11  2019 bin -> usr/bin
dr-xr-xr-x.  4 root root   30 Sep 23 20:07 boot
drwxr-xr-x.  2 root root   18 Sep 23 20:07 dev
drwxr-xr-x. 51 root root 4.0K Sep 23 20:07 etc
drwxr-xr-x.  2 root root    6 Feb 11  2019 home
lrwxrwxrwx.  1 root root    7 Feb 11  2019 lib -> usr/lib
lrwxrwxrwx.  1 root root    9 Feb 11  2019 lib64 -> usr/lib64
drwxr-xr-x.  2 root root    6 Feb 11  2019 media
drwxr-xr-x.  2 root root    6 Feb 11  2019 mnt
drwxr-xr-x.  2 root root    6 Feb 11  2019 opt
dr-xr-xr-x.  2 root root    6 Feb 11  2019 proc
dr-xr-x---.  2 root root    6 Feb 11  2019 root
drwxr-xr-x. 14 root root  190 Sep 23 20:07 run
lrwxrwxrwx.  1 root root    8 Feb 11  2019 sbin -> usr/sbin
drwxr-xr-x.  2 root root    6 Feb 11  2019 srv
dr-xr-xr-x.  2 root root    6 Feb 11  2019 sys
drwxrwxrwt.  2 root root    6 Feb 11  2019 tmp
drwxr-xr-x. 12 root root  144 Sep 23 20:07 usr
drwxr-xr-x. 18 root root  235 Sep 23 20:07 var

$ du -sh $mountpoint
552M    /var/lib/containers/storage/overlay/941e27b8da40fa9ac59e5f34ce2b68154844c32b0e85de09d22386dabf932f10/merged
```

Huh, that's a lot, python is pretty beefy.

And now we can run commands inside the container, the same way I described
[here](https://blog.tomecek.net/post/building-containers-with-buildah-and-ansible/).

Let's do it, just for sake of completeness.
```
$ cat 2.yaml
---
- hosts: all
  tasks:
  - command: python3 -c "print(\"python3 seems to be installed\")"
  - command: bash -c "echo \"and bash as well\""

$ ansible-playbook -vv -c buildah -i working-container, -e ansible_python_interpreter=/usr/bin/python3 2.yaml
ansible-playbook 2.8.5
  config file = /etc/ansible/ansible.cfg
  configured module search path = ['/root/.ansible/plugins/modules', '/usr/share/ansible/plugins/modules']
  ansible python module location = /usr/lib/python3.7/site-packages/ansible
  executable location = /usr/bin/ansible-playbook
  python version = 3.7.4 (default, Jul  9 2019, 16:32:37) [GCC 9.1.1 20190503 (Red Hat 9.1.1-1)]
Using /etc/ansible/ansible.cfg as config file

PLAYBOOK: 2.yaml ********************************************************************************************
1 plays in 2.yaml

PLAY [all] **************************************************************************************************

TASK [Gathering Facts] **************************************************************************************
task path: /root/2.yaml:2
ok: [working-container]
META: ran handlers

TASK [command] **********************************************************************************************
task path: /root/2.yaml:4
changed: [working-container] => {"changed": true, "cmd": ["python3", "-c", "print(\"python3 seems to be installed\")"], "delta": "0:00:00.011830", "end": "2019-09-23 18:15:45.791582", "rc": 0, "start": "2019-09-23 18:15:45.779752", "stderr": "", "stderr_lines": [], "stdout": "python3 seems to be installed", "stdout_lines": ["python3 seems to be installed"]}

TASK [command] **********************************************************************************************
task path: /root/2.yaml:5
changed: [working-container] => {"changed": true, "cmd": ["bash", "-c", "echo \"and bash as well\""], "delta": "0:00:00.002401", "end": "2019-09-23 18:15:47.838128", "rc": 0, "start": "2019-09-23 18:15:47.835727", "stderr": "", "stderr_lines": [], "stdout": "and bash as well", "stdout_lines": ["and bash as well"]}
META: ran handlers

PLAY RECAP **************************************************************************************************
working-container          : ok=3    changed=2    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0
```

That's it, this was a quick post. It would be nice to implement this workflow
inside [ansible-bender](https://github.com/ansible-community/ansible-bender),
but I'm still not sure how exactly.

