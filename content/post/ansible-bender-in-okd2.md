---
title: "Ansible Bender in OKD #2"
date: 2019-01-06T13:08:49+01:00
draft: false
tags: ["ansible", "linux", "containers"]
---

## tl;dr

**PoC Definition**: Can ansible-bender run inside an OpenShift origin pod?  
**Answer**: Yes!

<!--more-->

## Proof

```
$ oc exec -ti ab bash

[root@ab /]# id
uid=0(root) gid=0(root) groups=0(root)

[root@ab /]# mount | grep containers
/dev/mapper/luks-460d57c9-ef38-46d4-9bb1-f31b6c0feef5 on /var/lib/containers type xfs (rw,relatime,seclabel,attr2,inode64,noquota)

[root@ab ansible-bender]# ansible-bender build ./tests/data/basic_playbook.yaml fedora:29 test-image

PLAY [all] ***************************************************************************

TASK [Gathering Facts] ***************************************************************
ok: [test-image-20190105-231401150707-cont]

TASK [print local env vars] **********************************************************
ok: [test-image-20190105-231401150707-cont] => {
    "msg": "/tmp/abogz7g00c/ansible.cfg,,"
}
caching the task result in an image 'test-image-20191405-231405'

TASK [print all remote env vars] *****************************************************
ok: [test-image-20190105-231401150707-cont] => {
    "msg": {
        "DISTTAG": "f29container",
        "FBR": "f29",
        "FGC": "f29",
        "HOME": "/root",
        "LC_CTYPE": "C.UTF-8",
        "PATH": "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
        "PWD": "/",
        "SHLVL": "1",
        "_": "/usr/bin/python3"
    }
}
caching the task result in an image 'test-image-20191405-231406'

TASK [Run a sample command] **********************************************************
changed: [test-image-20190105-231401150707-cont]
caching the task result in an image 'test-image-20191405-231409'

TASK [create a file] *****************************************************************
changed: [test-image-20190105-231401150707-cont]
caching the task result in an image 'test-image-20191405-231413'

PLAY RECAP ***************************************************************************
test-image-20190105-231401150707-cont : ok=5    changed=2    unreachable=0    failed=0

Getting image source signatures
Skipping fetch of repeat blob sha256:29395e07566574e3bae3a899a7859cdc18fca5accef7b133670dbc7c9762f672
Skipping fetch of repeat blob sha256:a2d6fee87decc48d48c56895ff47c885b19d5e5e7eec920beaad6edd18628cd1
Copying config sha256:8c9be0ba2a39a00edc099cbf143b4a6088e7a23b40fe287a9993f72346497ce7

 0 B / 1.54 KiB [--------------------------------------------------------------]
 1.54 KiB / 1.54 KiB [======================================================] 0s
Writing manifest to image destination
Storing signatures
8c9be0ba2a39a00edc099cbf143b4a6088e7a23b40fe287a9993f72346497ce7
Image 'test-image' was built successfully \o/
```

If you [read my former blog post](https://blog.tomecek.net/post/ansible-bender-in-okd/), you saw that I bumped into several issues.
With help from [Ben Parees](https://github.com/bparees), I was able to tackle most of them. As I stated
in the other post, I decided to make `/var/lib/containers/` an OpenShift volume
(inspired by origin's git master), so that I can use the overlay backend. This
worked so smoothly that even the whole test suite started passing while running
in the pod. The only problem is that I had to abandon the `customStrategy`
build config, since it doesn't allow you to change the build pod.

There are two remaining problems to solve:

1. [The need for privileged.](https://github.com/ansible/ansible/issues/50583)
2. Deeper integration.

For the second point, imagine that you'd be able to define your build, specifying Ansible as a source:
```yaml
kind: "BuildConfig"
apiVersion: "vWishful"
metadata:
  name: "sample-build"
spec:
  source:
    git:
      uri: "https://github.com/a-repo/with-my-playbooks"
  strategy:
    ansibleStrategy:
      from:
        kind: "ImageStreamTag"
        name: "fedora:29"
      playbookPath: "my/favorite/playbook.yaml"
  output:
    to:
      kind: "ImageStreamTag"
      name: "my-lovely-image:latest"
```

I would certainly like that.

