+++
date = "2018-07-17T09:26:23+02:00"
title = "UEFI + LUKS + NVMe can be fun"
draft = true
tags = ["linux"]

+++

Recently I get a new laptop at work. I finally wanted to make my dream come
true and install [Gentoo
Linux](https://wiki.gentoo.org/wiki/Handbook:AMD64/Full/Installation) on it.
I've installed Gentoo already a few times so this wasn't a big deal.
Installing Gentoo is actually an awesome experience I learnt so much when doing
it for the first time. Everything went fine until I decided to install
bootloader and boot the thing.

So what went wrong?

<!---more-->

## Legacy boot did not work.

I have no idea why. (How can I debug this actually?) I suspect that grub did not play well with the NVMe SSD.


## Onto UEFI then!

I was actually glad this happened because I could finally boot with UEFI. I've never tried UEFI.

Except that it was so hard to make it work (mostly due to lack of knowledge on my side).


## Lessons learnt

Here's what went wrong for me, so you can learn from my mistakes:

0. **Please follow [the official documentation](https://wiki.gentoo.org/wiki/Handbook:AMD64/Full/Installation).**

1. **Your USB stick needs to boot from UEFI.**  
   The reason for this is that once you boot from UEFI, there will be a set of EFI variables exported via `/sys/firmware/efi` which are needed when installing grub.

2. **Gentoo LiveDVD is old.**  
   I write this in 2018 and last build of Gentoo LiveDVD is from 2016. 2016 kernel wasn't able to mount my XFS filesystem made by 2018 kernel. (What was I thinking, right?)

3. **How do I make an USB stick UEFI bootable?**  
   This one is fairly easy:

   1. Download latest [Fedora Workstation ISO](https://getfedora.org/en/workstation/download/).
   2. Modify the ISO in-place so it's UEFI-bootable from USB stick: `isohybrid -u Fedora-Workstation-Live-x86_64-28-1.1.iso`.
   3. Put it on the stick: `sudo dd if=Fedora-Workstation-Live-x86_64-28-1.1.iso status=progress of=/dev/<USB_STICK> bs=4M`.

4. **grub-mkconfig or grub-install spits errors and can't find the encrypted root.**  
   ```
   # grub-install /dev/nvme0n1
   Installing for i386-pc platform.
     /run/lvm/lvmetad.socket: connect failed: No such file or directory
     Volume group "crypt_root" not found
     Cannot process volume group crypt_root
     Volume group "crypt_root" not found
     Cannot process volume group crypt_root
   grub2-install: error: disk `lvm/crypt_root' not found.
   ```
   First make LVM available in the chroot environment. (Thanks to [this comment](https://gist.github.com/mattiaslundberg/8620837#gistcomment-19564461).)
   ```
   $ mkdir /mnt/gentoo/run/lvm
   $ mount --bind /run/lvm /mnt/gentoo/run/lvm
   ```
   And then make sure that your grub [is compiled](https://forums.gentoo.org/viewtopic-t-1050746.html) with support for device-mapper.
   ```
   $ cat /etc/portage/package.use
   sys-boot/grub device-mapper
   ```

5. **Initramfs can't detect the NVMe disk, sorry.**  
   I had to recompile the kernel and changed NVMe support to be directly included in the kernel (instead of being in a kernel module).

6. **Initramfs doesn't invoke cryptsetup...**  
   ...and errors out that it cannot find the root device.  
   The issue for me was that I specified incorrect parameters on kernel command line (via `/etc/default/grub`).  
   [Most of the documentation mentions `cryptdevice`](https://wiki.archlinux.org/index.php/GRUB#Root_partition) while only [this document mentions `crypt_root`](https://wiki.gentoo.org/wiki/Dm-crypt_full_disk_encryption). And that one is correct:  
   ```
   GRUB_CMDLINE_LINUX="crypt_root=UUID=2cc34ffc-adff-4f4e-b228-40b785677e4c"
   ```


Happy hacking.
