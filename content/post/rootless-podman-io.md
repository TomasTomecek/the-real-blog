---
title: "Rootless Podman I/O"
date: 2020-09-01T09:41:23+02:00
draft: false
---

A colleague of mine asked me today to prove that rootless podman has worse I/O
performance than running podman as root. Which I
[claimed](https://github.com/packit/packit.dev/pull/157#discussion_r478848718).

My instinct is that it gotta be worse, because
[fuse-overlayfs](https://github.com/containers/fuse-overlayfs) is overlayfs
implementation in userspace, so it gotta be less performant than a kernel
module. Let's see.

<!--more-->

When I started with the analysis, I first had to settle on a tool I'd use.
[This `unix.stackexchange` thread gave me some
answers](https://unix.stackexchange.com/questions/55212/how-can-i-monitor-disk-io).


I picked iostat and will be using a `-d` option:
```
-d     Display the device utilization report.
```

## The naive method

So let's start our test:
1. Run `iostat -d 10` — print the report every 10 seconds
2. Run `dnf install -y rpm-build` in a fresh fedora:32 container (first root, then rootless)
3. Check the numbers


### Numbers for root

```
Device             tps    kB_read/s    kB_wrtn/s    kB_dscd/s    kB_read    kB_wrtn    kB_dscd
dm-0              7.06        39.13       108.52         0.00   60476413  167728630          0
nvme0n1           6.78        39.18       104.64         0.65   60548168  161735177    1008412


Device             tps    kB_read/s    kB_wrtn/s    kB_dscd/s    kB_read    kB_wrtn    kB_dscd
dm-0             53.10        40.00       518.30         0.00        400       5183          0
nvme0n1          48.90        40.00       485.20         0.00        400       4852          0


Device             tps    kB_read/s    kB_wrtn/s    kB_dscd/s    kB_read    kB_wrtn    kB_dscd
dm-0             20.20        44.80      4035.20         0.00        448      40352          0
nvme0n1          24.80        44.80      4020.60         0.00        448      40206          0


Device             tps    kB_read/s    kB_wrtn/s    kB_dscd/s    kB_read    kB_wrtn    kB_dscd
dm-0             10.40       288.00        14.10         0.00       2880        141          0
nvme0n1          10.40       288.00         8.45         0.00       2880         84          0


Device             tps    kB_read/s    kB_wrtn/s    kB_dscd/s    kB_read    kB_wrtn    kB_dscd
dm-0             13.10        38.80       116.20         0.00        388       1162          0
nvme0n1          12.60        38.80       110.75         0.00        388       1107          0


Device             tps    kB_read/s    kB_wrtn/s    kB_dscd/s    kB_read    kB_wrtn    kB_dscd
dm-0             10.80        39.20       478.40         0.00        392       4784          0
nvme0n1          11.40        39.20       470.20         0.00        392       4702          0


Device             tps    kB_read/s    kB_wrtn/s    kB_dscd/s    kB_read    kB_wrtn    kB_dscd
dm-0             11.20        48.40      3940.60         0.00        484      39406          0
nvme0n1          18.40        48.40      3923.50         0.00        484      39235          0


Device             tps    kB_read/s    kB_wrtn/s    kB_dscd/s    kB_read    kB_wrtn    kB_dscd
dm-0            285.40        42.00     23880.70         0.00        420     238807          0
nvme0n1         308.90        42.00     23670.25         0.00        420     236702          0


Device             tps    kB_read/s    kB_wrtn/s    kB_dscd/s    kB_read    kB_wrtn    kB_dscd
dm-0              6.10        38.40        57.10         0.00        384        571          0
nvme0n1           6.00        38.40        50.80         0.00        384        508          0
```

It took a minute to fetch the repo metadata, then we can see a big spike in I/O
(reads, writes and tps) followed by the usual, calm, "nothing is happening"
period.

(`tps` stands for device I/O transactions per second)


### Numbers for rootless

These are pretty similar, except they fluctuate a bit:

```
Device             tps    kB_read/s    kB_wrtn/s    kB_dscd/s    kB_read    kB_wrtn    kB_dscd 
dm-0              7.07        39.13       108.73         0.00   60482717  168059431          0 
nvme0n1           6.79        39.18       104.85         0.65   60554472  162062895    1008412 


Device             tps    kB_read/s    kB_wrtn/s    kB_dscd/s    kB_read    kB_wrtn    kB_dscd 
dm-0             28.50        50.40      2291.15         0.00        504      22911          0 
nvme0n1          30.80        50.40      2260.00         0.00        504      22600          0 


Device             tps    kB_read/s    kB_wrtn/s    kB_dscd/s    kB_read    kB_wrtn    kB_dscd 
dm-0              7.30        28.00        61.10         0.00        280        611          0 
nvme0n1           7.30        28.00        46.55         0.00        280        465          0 


Device             tps    kB_read/s    kB_wrtn/s    kB_dscd/s    kB_read    kB_wrtn    kB_dscd 
dm-0              3.00        38.40        43.00         0.00        384        430          0 
nvme0n1           3.00        38.40        33.50         0.00        384        335          0 


Device             tps    kB_read/s    kB_wrtn/s    kB_dscd/s    kB_read    kB_wrtn    kB_dscd 
dm-0             36.00        51.20     15164.50         0.00        512     151645          0 
nvme0n1          44.50        51.20     10722.70         0.00        512     107227          0 


Device             tps    kB_read/s    kB_wrtn/s    kB_dscd/s    kB_read    kB_wrtn    kB_dscd 
dm-0              6.10        38.80        30.10         0.00        388        301          0 
nvme0n1          18.50        38.80      4455.25         0.00        388      44552          0 


Device             tps    kB_read/s    kB_wrtn/s    kB_dscd/s    kB_read    kB_wrtn    kB_dscd 
dm-0            229.50        40.00      2187.80         0.00        400      21878          0 
nvme0n1         231.00        40.00      1968.70         0.00        400      19687          0 


Device             tps    kB_read/s    kB_wrtn/s    kB_dscd/s    kB_read    kB_wrtn    kB_dscd 
dm-0             31.20        38.40       273.20         0.00        384       2732          0 
nvme0n1          27.40        38.40       260.20         0.00        384       2602          0 
```

`dnf` is fetching metadata, nothing is really happening, then a big I/O. The
main difference is `tps`, as you can see the I/O transactions were executed ~20
seconds after files were read and written to the FS.

You may be asking why there are 2 devices - that's simple: I have a NVMe SSD
disk (nvme0n1) and a fully encrypted FS (dm-0).


## Conclusion

Even though I clearly remember times when building images with rootless podman
on my laptop would result in a degraded performance of my OS, those times seem
to be over. Both root and rootless podman seem to be on par in terms of the I/O
performance.

Please take this blog post with a big grain of salt, I'm no filesystem kernel
engineer.
