+++
date = "2016-10-20T16:28:44+02:00"
tags = ["linux", "python"]
draft = false
title = "Non-blocking stdin with python using epoll"
+++

I was playing with `epoll` and was curious whether I can use it to monitor
`sys.stdin`. The biggest issue was that `sys.stdin.read()` is blocking and I
had no way to figure out whether I read the descriptor fully or not (making the
`epoll` useless pretty much). Until I changed it to non-blocking with `fcntl`.

<!--more-->

```python
import os
import sys
import fcntl
import select

fd = sys.stdin.fileno()
fl = fcntl.fcntl(fd, fcntl.F_GETFL)
fcntl.fcntl(fd, fcntl.F_SETFL, fl | os.O_NONBLOCK)

epoll = select.epoll()
epoll.register(fd, select.EPOLLIN)

try:
    while True:
        events = epoll.poll(1)
        for fileno, event in events:
            data = ""
            while True:
                l = sys.stdin.read(64)
                if not l:
                    break
                data += l
            print(data.upper(), end="")

finally:
    epoll.unregister(fd)
    epoll.close()
```

Sample usage:

```shell
$ python3 cat.py
asdqwe
ASDQWE
zxcasd
ZXCASD
^CTraceback (most recent call last):
  File "cat.py", line 15, in <module>
    events = epoll.poll(1)
KeyboardInterrupt

```
