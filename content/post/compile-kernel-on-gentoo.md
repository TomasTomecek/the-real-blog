+++
date = "2014-10-12T00:00:00+02:00"
draft = false
title = "Compiling kernel on gentoo"
tags = ["gentoo", "linux"]

+++

I've just updated to kernel 3.17. I compiled the kernel, installed it, generated initramfs, updated `grub.cfg` and rebooted my PC. I was unpleasantly surprised by:

<!--more-->

```
!! Block device "device" is not a valid root device...
!! Could not find the root block device in...
Please specify another value or: press Enter for the same, type "shell" for shell, or "q" to skip...
```

After some fiddling here and there I figured out that the problem is my initramfs: it was more than 3 times smaller than the one for 3.16. And then I got it. I forgot to install kernel modules — genkernel had no idea how to populate initramfs for 3.17 if there were no kernel modules installed.

Therefore I'm writing here down the correct process:

```
# emerge sources of course
$ eselect kernel set
$ cp /usr/src/linux-*/.config /usr/src/linux/
$ cd /usr/src/linux
# why would you compile kernel as root?
$ chown -R "regular_user" /usr/src/linux/
$ su - "regular_user"
# lots of ynynnynnyynn
$ make oldconfig
$ make
$ su -
$ make install
$ make modules_install
$ genkernel initramfs
$ grub2-mkconfig -o /boot/grub/grub.cfg
$ reboot
```
