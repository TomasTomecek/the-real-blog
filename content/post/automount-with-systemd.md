+++
date = "2016-04-18T15:11:04+02:00"
draft = false
title = "Automatic mounts with systemd"
tags = ["linux"]

+++

So I wanted to setup automatic mounting (read as autofs) with systemd, *without* using `fstab`.

Unfortunately, the man page didn't have any examples so it wasn't that easy to figure out. Luckily there is an excellent guide at RHCSA course [1].

Tl;dr

<!--more-->

## You need two files
1. First one to setup the mount itself.
2. Second to perform automatic mounting.

It's not that easy to name the file for automatic mounting. Quote from manpage:
```
Automount units must be named after the automount directories they control.
Example: the automount point /home/lennart must be configured in a unit file
home-lennart.automount. For details about the escaping logic used to convert
a file system path to a unit name see systemd.unit(5).
```

## Content of the files
```
$ cat /etc/systemd/system/mnt-scratch.automount
[Unit]
Description=Automount Scratch

[Automount]
Where=/mnt/scratch

[Install]
WantedBy=multi-user.target

$ cat /etc/systemd/system/mnt-scratch.mount
[Unit]
Description=Scratch

[Mount]
What=nfs.example.com:/export/scratch
Where=/mnt/scratch
Type=nfs

[Install]
WantedBy=multi-user.target
```

Now to notify systemd there are some new files available:
```
$ systemctl daemon-reload
```

## Runtime setup
Feel free to disable the `mount`, but `enable` the `automount`:

  ```
  $ systemctl is-enabled mnt-scratch.mount
  disabled
  $ systemctl is-enabled mnt-scratch.automount                                                                                             1 ↵
  enabled
  $ systemctl start mnt-scratch.automount                                                                                             1 ↵
  $ ls /mnt/scratch >/dev/null
  $ systemctl status mnt-scratch.automount
  ● mnt-scratch.automount - Automount Scratch
     Loaded: loaded (/etc/systemd/system/mnt-scratch.automount; enabled; vendor preset: disabled)
     Active: active (running) since Mon 2016-04-18 10:49:04 CEST; 4h 33min ago
      Where: /mnt/scratch

  Apr 18 10:49:04 oat systemd[1]: Set up automount Automount Scratch.
  Apr 18 10:49:14 oat systemd[1]: mnt-scratch.automount: Got automount request for /mnt/scratch, triggered by 20266 (zsh)
  $ systemctl status mnt-scratch.mount
  ● mnt-scratch.mount - Scratch
     Loaded: loaded (/proc/self/mountinfo; disabled; vendor preset: disabled)
     Active: active (mounted) since Mon 2016-04-18 10:49:16 CEST; 4h 33min ago
      Where: /mnt/scratch
       What: nfs.example.com:/export/scratch

  Apr 18 10:49:14 oat systemd[1]: Mounting Scratch...
  Apr 18 10:49:16 oat systemd[1]: Mounted Scratch.
  ```

[1] http://codingbee.net/tutorials/rhcsa/rhcsa-automounting-using-systemd/
