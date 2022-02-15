+++
date = "2018-05-14T14:47:31+02:00"
title = "Kerberos authentication in a container"
draft = false
atgs = ["linux", "containers", "lolz"]

+++

This is a quick one.

We have a bot which uses Kerberos for authentication with other services. Of
course we run our bot army as containers in
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
keyring](http://man7.org/linux/man-pages/man7/keyrings.7.html). ~~Keyring
is not namespaced, so this is a privileged operation~~.
```
[pid 19198] keyctl(KEYCTL_GET_PERSISTENT, 1000, KEY_SPEC_PROCESS_KEYRING) = -1 EPERM (Operation not permitted)
```

**EDIT Feb 2022**: [Keyrings are now aware of namespaces](https://lwn.net/Articles/779895/).

Solution is really easy. Just change the method how the [ticket granting ticket](https://web.mit.edu/kerberos/krb5-1.5/krb5-1.5.4/doc/krb5-admin/The-Ticket_002dGranting-Ticket.html)
should be stored and that's it. Therefore we'll just store it in a file and
we're done.

**EDIT Feb 2022**: I wasn't able to store the TGT in the (namespaced) kernel
keyring in a unprivileged container so the solution applies still.

So let's launch a container using [podman](https://github.com/projectatomic/libpod/), we'll bind-mount the Kerberos configuration from host inside the container. Notice, no `--cap-add` nor `--privileged`.
```
+ podman run -it -v /etc/krb5.conf:/etc/krb5.conf -v /etc/krb5.conf.d/:/etc/krb5.conf.d/ fedora:35 bash
```

We should install Kerberos tooling now:
```
[root@157d96c3df2e /]# dnf install fedora-packager-kerberos
Last metadata expiration check: 0:00:37 ago on Tue Feb 15 09:19:06 2022.
Dependencies resolved.
=================================================================================
 Package                                                             Architecture
=================================================================================
Installing:
 fedora-packager-kerberos                                            noarch      
Installing dependencies:
 krb5-pkinit                                                         x86_64      
 krb5-workstation                                                    x86_64      
 libkadm5                                                            x86_64      
 libss                                                               x86_64      

Transaction Summary
=================================================================================
Install  5 Packages

Total download size: 779 k
Installed size: 3.6 M
Is this ok [y/N]: y
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
