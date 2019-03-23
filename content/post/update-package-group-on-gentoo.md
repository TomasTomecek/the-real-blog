---
title: "Updating a group of packages on Gentoo"
date: 2019-03-31T16:18:52+01:00
draft: false
tags: ["gentoo", "linux", "portage"]
---

I wanted to update my gentoo box once again. I did last update probably ~6
months ago. This usually means for me that I get a ton of conflicts:

```
These are the packages that would be merged, in order:

Calculating dependencies... done!
[ebuild     U ~] dev-qt/qtcore-5.12.2 [5.11.1-r1]

!!! Multiple package instances within a single package slot have been pulled
!!! into the dependency graph, resulting in a slot conflict:

dev-qt/qtcore:5

  (dev-qt/qtcore-5.12.2:5/5.12::gentoo, ebuild scheduled for merge) pulled in by
    dev-qt/qtcore (Argument)

  (dev-qt/qtcore-5.11.1-r1:5/5.11::gentoo, installed) pulled in by
    ~dev-qt/qtcore-5.11.1 required by (dev-qt/qtdbus-5.11.1:5/5.11::gentoo, installed)
    ^              ^^^^^^
    (and 9 more with the same problem)
```

I was really hoping that portage would be so smart that would it update whole
qt stack in one transaction. Sadly, it did not and I realized that I had to tell it. But how?

The easiest solution I came up with was using `equery`: get installed packages
from dev-qt category:
```bash
$  equery l dev-qt/* -F '$category/$name'
dev-qt/linguist-tools
dev-qt/qtchooser
dev-qt/qtconcurrent
dev-qt/qtcore
dev-qt/qtdbus
dev-qt/qtgui
dev-qt/qtnetwork
dev-qt/qtsql
dev-qt/qtsvg
dev-qt/qtwidgets
dev-qt/qtx11extras
dev-qt/qtxml
```

And now we just feed this output to emerge:
```bash
$ emerge --ask -1 --verbose-conflicts $(equery l dev-qt/* -F '$category/$name')                                                                                                                   1 ↵

These are the packages that would be merged, in order:

Calculating dependencies... done!
[ebuild   R    ] dev-qt/qtchooser-0_p20170803
[ebuild     U  ] dev-qt/qtcore-5.11.3-r2 [5.11.1-r1]
[ebuild     U  ] dev-qt/qtxml-5.11.3 [5.11.1]
[ebuild     U  ] dev-qt/qtconcurrent-5.11.3 [5.11.1]
[ebuild     U  ] dev-qt/qtdbus-5.11.3 [5.11.1]
[ebuild     U  ] dev-qt/qtnetwork-5.11.3 [5.11.1]
[ebuild     U  ] dev-qt/qtsql-5.11.3 [5.11.1-r1]
[ebuild     U  ] dev-qt/linguist-tools-5.11.3 [5.11.1]
[ebuild     U  ] dev-qt/qtgui-5.11.3 [5.11.1]
[ebuild     U  ] dev-qt/qtwidgets-5.11.3 [5.11.1]
[ebuild     U  ] dev-qt/qtx11extras-5.11.3 [5.11.1]
[ebuild     U  ] dev-qt/qtsvg-5.11.3 [5.11.1]

Would you like to merge these packages? [Yes/No] Y
```

I wish emerge was smarter in this use case, but on the other hand, the solution
is also not that hard.
