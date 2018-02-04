---
title: "Building Container Images with Buildah and Ansible"
date: 2018-02-04T11:12:00+01:00
tags: ["Ansible", "containers", "linux", "Fedora", "buildah"]
draft: false
---

Do you use Ansible roles to provision your infrastructure? And would you like
to use those very same roles to create container images? You came to the right
place!

We are working on a project (and you problably heard of it already) called
[Ansible Container](https://github.com/ansible/ansible-container). It's not
just about creation of container images. It covers the complete workflow of
a containerized application. From build, local run, test to deploy.

In this blog post, I would like to show you how Ansible Container does those
builds — from an Ansible role to a container image.

<!--more-->


## Let's start

...with the Ansible role itself. If you are not familar with the role concept,
look at [the excellent Ansible
documentation](http://docs.ansible.com/ansible/latest/playbooks_reuse_roles.html).

We will create a simple role which just installs nginx. Since I'm most familar
with
[Fedora](https://download.fedoraproject.org/pub/fedora/linux/releases/27/Docker/x86_64/images/Fedora-Docker-Base-27-1.6.x86_64.tar.xz),
that's what we'll use. Feel free to use the base image which you are most
familiar with.

This is how it looks:
```yaml
$ cat roles/sample-nginx/tasks/main.yml
- name: Install nginx
  dnf:
    name: nginx
    state: installed
- name: Clean dnf metadata
  command: dnf clean all
```

Simple and straightforward. Just install nginx package and clean packager
metadata -- we don't want those linger in the image. Just look at how much
useless data you may get. With metadata:
```console
REPOSITORY          TAG                 IMAGE ID            CREATED             SIZE
nginx               latest              fefdf36aa71b        14 seconds ago      441 MB
```

And without them:
```console
REPOSITORY          TAG                 IMAGE ID            CREATED             SIZE
nginx               latest              addb24556d33        23 seconds ago      268 MB
```


## Can we create the container now?

Okay, we have the role, now we need to run it against a container. For that, we
need to write a simple playbook which will:

 1. Create the container.
 2. Execute the role in the container.
 3. Commit the container into a container image.

Something like this should be sufficient:
```
---
- hosts: localhost
  connection: local
  vars:
    image: fedora:27
    container_name: build_container
    image_name: nginx
  tasks:
  - name: Make the base image available locally
    docker_image:
      name: '{{ image }}'

  - name: Create the container
    docker_container:
      image: '{{ image }}'
      name: '{{ container_name }}'
      command: sleep infinity

  - name: Add the newly created container to the inventory
    add_host:
      hostname: '{{ container_name }}'
      ansible_connection: docker
      ansible_python_interpreter: /usr/bin/python3  # fedora container doesn't ship python2

  - name: Run the role in the container
    delegate_to: '{{ container_name }}'
    include_role:
      name: sample-nginx

  - name: Commit the container
    command: docker commit \
      -c 'CMD ["nginx", "-g", "daemon off;"]' \
      {{ container_name }} {{ image_name }}

  - name: Remove the container
    docker_container:
      name: '{{ container_name }}'
      state: absent
```

So, what's happening here?

 1. We first pull the base container image.
 2. Then we create a container out of it. The important part is `sleep
    infinity` -- the container needs to be running while we execute the role in
    it.
 3. Once the container is running, we need to add it to Ansible's inventory. We
    are also setting that host (the container) to be available via docker
    connection plugin.
 4. We're are ready to run the role! The snippet is actually taken from
    [Ansible
    documentation](http://docs.ansible.com/ansible/latest/intro_inventory.html#non-ssh-connection-types).
 5. Our container is provisioned, we can commit, thus making a container image.
 6. And finally, let's remove the container, we don't need it anymore.


## All the files together

I put all the files inside a git repository so you don't have to copy-paste
them:
[TomasTomecek/ansible-nginx-container](https://github.com/TomasTomecek/ansible-nginx-container).

The repo looks like this:

```
.
├── ansible.cfg
├── inventory
├── provision-container.yml
└── roles
    └── sample-nginx
        └── tasks
            └── main.yml
```

Let's run the thing:

```console
$ ansible-playbook provision-container.yml

PLAY [localhost] **********************************************************************

TASK [Gathering Facts] ****************************************************************
ok: [localhost]

TASK [Make the base image available locally] ******************************************
ok: [localhost]

TASK [Create the container] ***********************************************************
changed: [localhost]

TASK [Add the newly created container to the inventory] *******************************
changed: [localhost]

TASK [Run the role in the container] **************************************************

TASK [sample-nginx : Install nginx] ***************************************************
changed: [localhost -> build_container]

TASK [sample-nginx : Clean dnf metadata] **********************************************
 [WARNING]: Consider using dnf module rather than running dnf

changed: [localhost -> build_container]

TASK [commit the container] ***********************************************************
changed: [localhost]

TASK [remove the container] ***********************************************************
changed: [localhost]

PLAY RECAP ****************************************************************************
localhost                  : ok=8    changed=6    unreachable=0    failed=0
```

```console
$ docker images nginx
REPOSITORY          TAG                 IMAGE ID            CREATED             SIZE
nginx               latest              addb24556d33        23 seconds ago      268 MB
```

Does it actually work?

```
$ docker run -d nginx
```

```
$ curl -s 172.17.0.2 | grep title
        <title>Test Page for the Nginx HTTP Server on Fedora</title>
```

Yep, it does.

That was pretty mindblowing, right? But we can still do better


## Now without daemons

The main problem I have with the proposed solution is that we need a pretty big
daemon to be able to create a container image. The truth is that I don't want
such daemons. Luckily, we can use
[buildah](https://www.projectatomic.io/blog/2017/06/introducing-buildah/) — a
simple CLI tool purposed to create container images.

We don't need to do any changes in our role. Unfortunately the playbook needs
to be changed a lot. So let's add support for buildah to it!

```
---
- hosts: localhost
  connection: local
  # gather_facts: false
  vars:
    image: fedora:27
    container_name: build_container
    image_name: nginx
    container_engine: buildah  # or docker
  tasks:
  - name: Obtain base image and create a container out of it
    command: 'buildah from --name {{ container_name }} docker://{{ image }}'
    become: true
    when: container_engine == 'buildah'

  - block:
    - name: Make the base image available locally
      docker_image:
        name: '{{ image }}'
    - name: Create the container
      docker_container:
        image: '{{ image }}'
        name: '{{ container_name }}'
        command: sleep infinity
    when: container_engine == 'docker'

  - name: Add the newly created container to the inventory
    add_host:
      hostname: '{{ container_name }}'
      ansible_connection: '{{ container_engine }}'
      ansible_python_interpreter: /usr/bin/python3  # fedora container doesn't ship python2

  - name: Run the role in the container
    delegate_to: '{{ container_name }}'
    include_role:
      name: sample-nginx

  - block:
    - name: Change default command of the container image
      command: 'buildah config --cmd "nginx -g \"daemon off;\"" {{ container_name }}'
    - name: Commit the container and make it an image
      command: 'buildah commit --rm {{ container_name }} docker-daemon:{{ image_name }}:latest'
    when: container_engine == 'buildah'

  - block:
    - name: Commit the container and make it an image
      command: docker commit \
        -c 'CMD ["nginx", "-g", "daemon off;"]' \
        {{ container_name }} {{ image_name }}
    - name: Remove the container
      docker_container:
        name: '{{ container_name }}'
        state: absent
    when: container_engine == 'docker'
```

What we did?

 * We kept the existing code and just wrapped docker-specific tasks with `when: container_engine == 'docker'`.
 * We added more tasks specific to `buildah`.
 * Two tasks needed almost no changes: role execution and inventory update.

Let's get briefly through the additions:

 * Command `buildah from` fetches an image if it's not present locally and creates a container out of it. Two in one.
 * `buildah` has a dedicated command, `config`, to change container image metadata.
 * And finally we just commit the container. It's pretty awesome that you can put the image inside local dockerd.


Let's build using buildah:

```
$ ansible-playbook provision-container.yml

PLAY [localhost] **********************************************************************

TASK [Gathering Facts] ****************************************************************
ok: [localhost]

TASK [Obtain base image and create a container out of it] *****************************
changed: [localhost]

TASK [Make the base image available locally] ******************************************
skipping: [localhost]

TASK [Create the container] ***********************************************************
skipping: [localhost]

TASK [Add the newly created container to the inventory] *******************************
changed: [localhost]

TASK [Run the role in the container] **************************************************

TASK [sample-nginx : Install nginx] ***************************************************
fatal: [localhost]: UNREACHABLE! => {"changed": false, "msg": "Authentication or permission failure. In some cases, you
may have been able to authenticate and did not have permissions on the target directory. Consider changing the remote
temp path in ansible.cfg to a path rooted in \"/tmp\". Failed command was: ( umask 77 && mkdir -p \"` echo
~/.ansible/tmp/ansible-tmp-1517739453.02-84600074672209 `\" && echo ansible-tmp-1517739453.02-84600074672209=\"` echo
~/.ansible/tmp/ansible-tmp-1517739453.02-84600074672209 `\" ), exited with result 1", "unreachable": true}

PLAY RECAP ****************************************************************************
localhost                  : ok=3    changed=2    unreachable=1    failed=0   
```

Whoops! Something's not quite right. When this happens, I advise you to run with `-vvvv`:
```console
TASK [sample-nginx : Install nginx] ***************************************************
task path: /home/tt/g/the-real-blog/nginx-container/roles/sample-nginx/tasks/main.yml:1
Using module file /usr/lib/python2.7/site-packages/ansible/modules/packaging/os/dnf.py
<build_container> RUN ['buildah', 'mount', '--', 'build_container']
<build_container> RUN ['buildah', 'run', '--', 'build_container', '/bin/sh', '-c', 'echo ~ && sleep 0']
<build_container> RUN ['buildah', 'run', '--', 'build_container', '/bin/sh', '-c', '( umask 77 && mkdir -p "` echo
~/.ansible/tmp/ansible-tmp-1517739667.49-225002665068293 `" && echo ansible-tmp-1517739667.49-225002665068293="` echo
~/.ansible/tmp/ansible-tmp-1517739667.49-225002665068293 `" ) && sleep 0']
<build_container> RUN ['buildah', 'umount', '--', 'build_container']
fatal: [localhost]: UNREACHABLE! => {
    "changed": false, 
    "msg": "Authentication or permission failure. In some cases, you may have been able to authenticate and did not have
permissions on the target directory. Consider changing the remote temp path in ansible.cfg to a path rooted in
\"/tmp\". Failed command was: ( umask 77 && mkdir -p \"` echo
~/.ansible/tmp/ansible-tmp-1517739667.49-225002665068293 `\" && echo ansible-tmp-1517739667.49-225002665068293=\"`
echo ~/.ansible/tmp/ansible-tmp-1517739667.49-225002665068293 `\" ), exited with result 1, stderr output:
time=\"2018-02-04T11:21:07+01:00\" level=error msg=\"mkdir /var/lib/containers/storage/mounts: permission
denied\nmkdir /var/lib/containers/storage/mounts: permission denied\" \n", 
"unreachable": true
}
```

That's much more informative, the important part being:
```
stderr output: time=\"2018-02-04T11:21:07+01:00\" level=error msg=\"mkdir /var/lib/containers/storage/mounts: permission
denied\nmkdir /var/lib/containers/storage/mounts: permission denied\" \n"
```

What's happening here is that `ansible-playbook` is invoking buildah to run a
command inside the build container. Buildah needs to access
`/var/lib/containers/storage` and doesn't have the right permissions when
invoked with your unprivileged user:
```console
$ ll -d /var/lib/containers/storage
drwx------. 8 root root 4.0K Nov 13 14:05 /var/lib/containers/storage
```

Unfortunately the original error message is not quite helpful. The solution here is simple — `sudo`:

```console
$ sudo ansible-playbook provision-container.yml

PLAY [localhost] ***********************************************************************

TASK [Gathering Facts] *****************************************************************
ok: [localhost]

TASK [Obtain base image and create a container out of it] ******************************
changed: [localhost]

TASK [Make the base image available locally] *******************************************
skipping: [localhost]

TASK [Create the container] ************************************************************
skipping: [localhost]

TASK [add the newly created container to the inventory] ********************************
changed: [localhost]

TASK [run the role in the container] ***************************************************

TASK [sample-nginx : install nginx] ****************************************************
changed: [localhost -> build_container]

TASK [sample-nginx : clean dnf metadata] ***********************************************
 [WARNING]: Consider using dnf module rather than running dnf

changed: [localhost -> build_container]

TASK [Change default command of the container image] ***********************************
changed: [localhost]

TASK [Commit the container and make it an image] ***************************************
changed: [localhost]

TASK [Commit the container and make it an image] ***************************************
skipping: [localhost]

TASK [remove the container] ************************************************************
skipping: [localhost]

PLAY RECAP *****************************************************************************
localhost                  : ok=7    changed=6    unreachable=0    failed=0
```

That worked just fine. Let's see if we have the container image in dockerd:
```console
$ docker images docker.io/nginx
REPOSITORY          TAG                 IMAGE ID            CREATED             SIZE
docker.io/nginx     latest              8f1aaab79770        25 seconds ago      268 MB
```

Looks about right. Does it work?
```console
$ docker run -d docker.io/nginx
3165ec03253bae24951d20ab7a4a3905f824b67304eca16ae0ce9ca01504c411

$ docker ps
CONTAINER ID        IMAGE               COMMAND                  CREATED             STATUS                  PORTS               NAMES
3165ec03253b        docker.io/nginx     "nginx -g 'daemon ..."   2 seconds ago       Up Less than a second                       kind_mayer
$ curl -s 172.17.0.2 | grep title
        <title>Test Page for the Nginx HTTP Server on Fedora</title>
```

Sweet!


## Conclussion

We created a container image using an Ansible role without any daemons. Pretty
awesome, right?!

If you don't like the long playbook we had to create to execute this, I advise
you to check out [Ansible
Container](https://github.com/ansible/ansible-container) — it contains the
logic of that playbook (and much more): all you need to provide is just the
container metadata and them roles. [We are still working on integrating buildah
in it](https://github.com/ansible/ansible-container/pull/790).

It's likely that you may need to tinker with your roles a bit to make them work
in containers. The same will apply for roles from [Ansible
Galaxy](https://galaxy.ansible.com/). While working on this blog post, I tried
several, popular, nginx Ansible roles from Ansible Galaxy and got to be honest,
none of them worked in container environemnt out of the box.

And finally, I can't wait to start running my containers with
[podman](https://github.com/projectatomic/libpod/blob/master/docs/podman.1.md).

