---
title: "RHEL 9 and PyPI RPMs"
date: 2022-06-14T08:00:00+01:00
draft: false
tags: ["RHEL", "Python", "PyPI", "Containers"]
---

My colleague, [@FrostyX](https://frostyx.cz/), recently shared a Red Hat Developer article, [Thousands
of PyPI and RubyGems RPMs now available for RHEL
9](https://developers.redhat.com/articles/2022/06/07/thousands-pypi-and-rubygems-rpms-now-available-rhel-9),
with us.

TL;DR access thousands of RPMs automatically generated from PyPI and RubyGems on RHEL 9.

Sounds intriguing, I wanted to give it a shot.

<!--more-->

## Task

Build our python library [ogr](https://github.com/packit/ogr) with those RPMs.


## Do

Let's launch a UBI9 container:
```
$ podman run --rm -ti registry.access.redhat.com/ubi9/ubi bash
Trying to pull registry.access.redhat.com/ubi9/ubi:latest...
Getting image source signatures
Checking if image destination supports signatures
Copying blob f95ee31bf3b7 done
Copying blob 2c9b1d3d1a0a done
Copying config 46720ac964 done
Writing manifest to image destination
Storing signatures

[root@56cfdd79ba1e /]# 
```

Well, hello!

Let's enable the Copr project with the PyPI RPMs:
```
[root@56cfdd79ba1e /]# dnf copr enable @copr/PyPI epel-9-x86_64
Updating Subscription Management repositories.
Unable to read consumer identity
Subscription Manager is operating in container mode.

This system is not registered with an entitlement server. You can use subscription-manager to register.

Enabling a Copr repository. Please note that this repository is not part
of the main distribution, and quality may vary.

The Fedora Project does not exercise any power over the contents of
this repository beyond the rules outlined in the Copr FAQ at
<https://docs.pagure.org/copr.copr/user_documentation.html#what-i-can-build-in-copr>,
and packages are not held to any quality or security level.

Please do not file bug reports about these packages in Fedora
Bugzilla. In case of problems, contact the owner of this repository.

Do you really want to enable copr.fedorainfracloud.org/@copr/PyPI? [y/N]: y
Repository successfully enabled.
```

Neat.

Ogr doesn't need anything from EPEL, so we should be good here.


### Create SRPM

On my host system, I'll create an SRPM from upstream ogr repo using [Packit](https://packit.dev/).
```
$ cd ogr
$ packit srpm
...
2022-06-14 08:47:27.188 srpm.py           INFO   SRPM: /home/tt/g/packit/ogr/python-ogr-0.34.1.dev82+g83ca4c8-1.20220614084726571994.main.82.g83ca4c8.fc36.src.rpm
```

We can now copy it inside the UBI9 container:
```
$ podman cp ./python-ogr-0.34.1.dev82+g83ca4c8-1.20220614084726571994.main.82.g83ca4c8.fc36.src.rpm crazy_beaver:/root
```


### Create RPM

Back to the container env. We need `rpmbuild` program so we can build binary RPMs:
```
[root@56cfdd79ba1e /]# dnf install -y rpm-build

...

Installed:
  ...
  rpm-build-4.16.1.3-12.el9_0.x86_64

Complete!
```

And we also need build dependencies for ogr. This is the time where the repo will shine:
```
[root@56cfdd79ba1e /]# cd /root
[root@56cfdd79ba1e ~]# dnf builddep -y ./python-ogr-0.34.1.dev82+g83ca4c8-1.20220614084726571994.main.82.g83ca4c8.fc36.src.rpm
Last metadata expiration check: 0:10:12 ago on Tue Jun 14 08:37:43 2022.
Package python3-setuptools-53.0.0-10.el9.noarch is already installed.
Dependencies resolved.
============================================================================================================================================================================================================================================
 Package                                                           Architecture                          Version                                        Repository                                                                     Size
============================================================================================================================================================================================================================================
Installing:
 python3-devel                                                     x86_64                                3.9.10-2.el9                                   ubi-9-appstream                                                               252 k
 python3-setuptools-scm                                            noarch                                6.4.2-1.el9                                    copr:copr.fedorainfracloud.org:group_copr:PyPI                                 65 k
 python3-setuptools-scm-git-archive                                noarch                                1.1-1.el9                                      copr:copr.fedorainfracloud.org:group_copr:PyPI                                 12 k
Installing dependencies:
 python-rpm-macros                                                 noarch                                3.9-52.el9                                     ubi-9-appstream                                                                20 k
 python3-packaging                                                 noarch                                21.3-1.el9                                     copr:copr.fedorainfracloud.org:group_copr:PyPI                                 68 k
 python3-pyparsing                                                 noarch                                3.0.7-1.el9                                    copr:copr.fedorainfracloud.org:group_copr:PyPI                                154 k
 python3-rpm-generators                                            noarch                                12-8.el9                                       ubi-9-appstream                                                                33 k
 python3-rpm-macros                                                noarch                                3.9-52.el9                                     ubi-9-appstream                                                                16 k
 python3-tomli                                                     noarch                                2.0.1-1.el9                                    copr:copr.fedorainfracloud.org:group_copr:PyPI                                 28 k
Installing weak dependencies:
 python3-pip                                                       noarch                                22.0.4-1.el9                                   copr:copr.fedorainfracloud.org:group_copr:PyPI                                2.7 M

Transaction Summary
============================================================================================================================================================================================================================================
Install  10 Packages
```

Very nice!!

We can now proceed with the build:
```
[root@56cfdd79ba1e /]# rpmbuild --rebuild ./python-ogr-0.34.1.dev82+g83ca4c8-1.20220614084726571994.main.82.g83ca4c8.fc36.src.rpm

...

+ exit 0
Provides: python-ogr = 0.34.1.dev82+g83ca4c8-1.20220614084726571994.main.82.g83ca4c8.el9 python3-ogr = 0.34.1.dev82+g83ca4c8-1.20220614084726571994.main.82.g83ca4c8.el9 python3.9-ogr = 0.34.1.dev82+g83ca4c8-1.20220614084726571994.main.82.g83ca4c8.el9 python3.9dist(ogr) = 0.34.1~~dev82 python3dist(ogr) = 0.34.1~~dev82
Requires(rpmlib): rpmlib(CompressedFileNames) <= 3.0.4-1 rpmlib(FileDigests) <= 4.6.0-1 rpmlib(PartialHardlinkSets) <= 4.0.4-1 rpmlib(PayloadFilesHavePrefix) <= 4.0-1
Requires: python(abi) = 3.9 python3.9dist(cryptography) python3.9dist(deprecated) python3.9dist(gitpython) python3.9dist(pygithub) python3.9dist(python-gitlab) python3.9dist(pyyaml) python3.9dist(requests) python3.9dist(urllib3)
Obsoletes: python-ogr < 0.34.1.dev82+g83ca4c8-1.20220614084726571994.main.82.g83ca4c8.el9 python39-ogr < 0.34.1.dev82+g83ca4c8-1.20220614084726571994.main.82.g83ca4c8.el9
Checking for unpackaged file(s): /usr/lib/rpm/check-files /root/rpmbuild/BUILDROOT/python-ogr-0.34.1.dev82+g83ca4c8-1.20220614084726571994.main.82.g83ca4c8.el9.x86_64
Wrote: /root/rpmbuild/RPMS/noarch/python3-ogr-0.34.1.dev82+g83ca4c8-1.20220614084726571994.main.82.g83ca4c8.el9.noarch.rpm
```

Sweet, we got it!

