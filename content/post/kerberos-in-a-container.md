+++
date = "2018-05-14T14:47:31+02:00"
title = "Kerberos authentication in a container"
draft = false
atgs = ["linux", "containers", "lolz"]

+++

This is a quick one.

We have a bot which uses Kerberos for authentication with other services. Of
course we run our bot army in containers within
[OpenShift](https://github.com/openshift/origin).

How do we do it? How can we use Kerberos inside linux containers?


<!--more-->

...and not get eaten by errors such as

```
klist: Invalid UID in persistent keyring name while resolving ccache KEYRING:persistent:1000:krb_ccache_H2AfxtO
```

or

```
klist: Invalid UID in persistent keyring name while resolving ccache KEYRING:persistent:1000
```

or

```
klist: Invalid UID in persistent keyring name while getting default ccache
```


### Solution

The main issue is that Kerberos by default stores credentials inside [kernel
keyring](http://man7.org/linux/man-pages/man7/keyrings.7.html). Keyring
is not namespaced, so this is a privileged operation.
```
[pid 19198] keyctl(KEYCTL_GET_PERSISTENT, 1000, KEY_SPEC_PROCESS_KEYRING) = -1 EPERM (Operation not permitted)
```

Solution is really easy. Just change the method how the [ticket granting ticket](https://web.mit.edu/kerberos/krb5-1.5/krb5-1.5.4/doc/krb5-admin/The-Ticket_002dGranting-Ticket.html)
should be stored and that's it. Therefore we'll just store it in a file and
we're done.

So let's launch a container using [podman](https://github.com/projectatomic/libpod/), we'll bind-mount the Kerberos configuration from host inside the container. Notice, no `--cap-add` nor `--privileged`.
```
+ sudo podman run -it -v /etc/krb5.conf:/etc/krb5.conf -v /etc/krb5.conf.d/:/etc/krb5.conf.d/ registry.fedoraproject.org/fedora:28 bash
Trying to pull registry.fedoraproject.org/fedora:28...Getting image source signatures
Copying blob sha256:548d1dae8c2b61abb3d4d28a10a67e21d5278d42d1f282428c0dcbba06844c2c
 85.59 MB / 85.59 MB [====================================================] 1m6s
Copying config sha256:426866d6fa419873f97e5cbd320eeb22778244c1dfffa01c944db3114f55772e
 1.27 KB / 1.27 KB [========================================================] 0s
Writing manifest to image destination
Storing signatures
```

We should install Kerberos tooling now:
```
[root@101ff1a35d4d /]# dnf install krb5-workstation
Fedora 28 - x86_64 - Updates                                                  5.0 MB/s | 7.1 MB     00:01
Fedora 28 - x86_64                                                            4.6 MB/s |  60 MB     00:13
Last metadata expiration check: 0:00:03 ago on Mon May 14 13:11:33 2018.
Dependencies resolved.
================================================================================================================
 Package                       Arch              Version                       Repository                  Size
================================================================================================================
Installing:
 krb5-workstation              x86_64            1.16.1-2.fc28                 updates                    913 k
Upgrading:
 krb5-libs                     x86_64            1.16.1-2.fc28                 updates                    801 k
Installing dependencies:
 libkadm5                      x86_64            1.16.1-2.fc28                 updates                    176 k
 libss                         x86_64            1.43.8-2.fc28                 fedora                      51 k

Transaction Summary
================================================================================================================
Install  3 Packages
Upgrade  1 Package

Total download size: 1.9 M
Is this ok [y/N]: y
Downloading Packages:
(1/4): libss-1.43.8-2.fc28.x86_64.rpm                                           750 kB/s |  51 kB     00:00
(2/4): libkadm5-1.16.1-2.fc28.x86_64.rpm                                        1.5 MB/s | 176 kB     00:00
(3/4): krb5-workstation-1.16.1-2.fc28.x86_64.rpm                                2.6 MB/s | 913 kB     00:00
(4/4): krb5-libs-1.16.1-2.fc28.x86_64.rpm                                       988 kB/s | 801 kB     00:00
----------------------------------------------------------------------------------------------------------------
Total                                                                           726 kB/s | 1.9 MB     00:02
Running transaction check
Transaction check succeeded.
Running transaction test
Transaction test succeeded.
Running transaction
  Preparing        :                                                                                        1/1
  Upgrading        : krb5-libs-1.16.1-2.fc28.x86_64                                                         1/5
warning: /etc/krb5.conf created as /etc/krb5.conf.rpmnew
  Installing       : libkadm5-1.16.1-2.fc28.x86_64                                                          2/5
  Installing       : libss-1.43.8-2.fc28.x86_64                                                             3/5
  Running scriptlet: libss-1.43.8-2.fc28.x86_64                                                             3/5
  Installing       : krb5-workstation-1.16.1-2.fc28.x86_64                                                  4/5
  Cleanup          : krb5-libs-1.16-21.fc28.x86_64                                                          5/5
  Running scriptlet: krb5-libs-1.16-21.fc28.x86_64                                                          5/5
  Verifying        : krb5-workstation-1.16.1-2.fc28.x86_64                                                  1/5
  Verifying        : libkadm5-1.16.1-2.fc28.x86_64                                                          2/5
  Verifying        : libss-1.43.8-2.fc28.x86_64                                                             3/5
  Verifying        : krb5-libs-1.16.1-2.fc28.x86_64                                                         4/5
  Verifying        : krb5-libs-1.16-21.fc28.x86_64                                                          5/5

Installed:
  krb5-workstation.x86_64 1.16.1-2.fc28         libkadm5.x86_64 1.16.1-2.fc28
  libss.x86_64 1.43.8-2.fc28

Upgraded:
  krb5-libs.x86_64 1.16.1-2.fc28

Complete!
```

And now we'll do the magic trick: we'll tell Kerberos to store the TGT inside `/tmp/tgt`:
```
[root@101ff1a35d4d /]# export KRB5CCNAME=FILE:/tmp/tgt
```

Primetime!
```
[root@101ff1a35d4d /]# kinit ttomecek@FEDORAPROJECT.ORG
Password for ttomecek@FEDORAPROJECT.ORG:
[root@101ff1a35d4d /]# klist
Ticket cache: FILE:/tmp/tgt
Default principal: ttomecek@FEDORAPROJECT.ORG

Valid starting     Expires            Service principal
05/14/18 13:12:57  05/15/18 13:12:51  krbtgt/FEDORAPROJECT.ORG@FEDORAPROJECT.ORG
        renew until 05/21/18 13:12:51
```

Obviously, this is insecure since everyone can find that file easily. Please
make sure that your containers are secure and you know what you are running
inside.

Also doing the same thing with docker:
```
+ docker run -it -v /etc/krb5.conf:/etc/krb5.conf -v /etc/krb5.conf.d/:/etc/krb5.conf.d/ fedora-with-krb5-workstation bash
[ddbd@a9c95325be85 ~]$ export KRB5CCNAME=FILE:/tmp/tgt
[ddbd@a9c95325be85 ~]$ kinit ttomecek@FEDORAPROJECT.ORG
Password for ttomecek@FEDORAPROJECT.ORG:
[ddbd@a9c95325be85 ~]$ klist
Ticket cache: FILE:/tmp/tgt
Default principal: ttomecek@FEDORAPROJECT.ORG

Valid starting       Expires              Service principal
05/14/2018 13:08:29  05/15/2018 13:08:14  krbtgt/FEDORAPROJECT.ORG@FEDORAPROJECT.ORG
        renew until 05/21/2018 13:08:14
```
