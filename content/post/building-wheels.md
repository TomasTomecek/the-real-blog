---
title: "Building and serving local python wheels"
date: "2024-06-10T16:00:00+02:00"
draft: false
tags: ["python", "packaging", "wheels"]
---

We need to rebuild a dependency tree of python wheels from scratch. Bootstrap, in other words. Let's go!

<!--more-->

[Fromager](https://github.com/python-wheel-build/fromager) will do all the hard work. Let's install it.

We will create a temporary directory where everything will happen.

```
$ mkdir f && cd f
```

We can start with something trivial, such as the `six` module.

```
$ fromager bootstrap six
* handling toplevel requirement six []
saved /home/tt/t/f/sdists-repo/downloads/six-1.16.0.tar.gz
new toplevel dependency six resolves to 1.16.0
preparing source for six from /home/tt/t/f/sdists-repo/downloads/six-1.16.0.tar.gz
prepared source for six at /home/tt/t/f/work-dir/six-1.16.0/six-1.16.0
getting build system dependencies for six in /home/tt/t/f/work-dir/six-1.16.0/six-1.16.0
** handling build-system requirement setuptools>=40.8.0 [('toplevel', <Requirement('six')>, <Version('1.16.0')>)]
saved /home/tt/t/f/sdists-repo/downloads/setuptools-70.0.0.tar.gz
new build-system dependency setuptools>=40.8.0 resolves to 70.0.0
preparing source for setuptools>=40.8.0 from /home/tt/t/f/sdists-repo/downloads/setuptools-70.0.0.tar.gz
prepared source for setuptools>=40.8.0 at /home/tt/t/f/work-dir/setuptools-70.0.0/setuptools-70.0.0
getting build system dependencies for setuptools>=40.8.0 in /home/tt/t/f/work-dir/setuptools-70.0.0/setuptools-70.0.0
getting build backend dependencies for setuptools>=40.8.0 in /home/tt/t/f/work-dir/setuptools-70.0.0/setuptools-70.0.0
*** handling build-backend requirement wheel [('toplevel', <Requirement('six')>, <Version('1.16.0')>), ('build-system', <Requirement('setuptools>=40.8.0')>, <Version('70.0.0')>)]
saved /home/tt/t/f/sdists-repo/downloads/wheel-0.43.0.tar.gz
new build-backend dependency wheel resolves to 0.43.0
preparing source for wheel from /home/tt/t/f/sdists-repo/downloads/wheel-0.43.0.tar.gz
prepared source for wheel at /home/tt/t/f/work-dir/wheel-0.43.0/wheel-0.43.0
getting build system dependencies for wheel in /home/tt/t/f/work-dir/wheel-0.43.0/wheel-0.43.0
**** handling build-system requirement flit_core<4,>=3.8 [('toplevel', <Requirement('six')>, <Version('1.16.0')>), ('build-system', <Requirement('setuptools>=40.8.0')>, <Version('70.0.0')>), ('build-backend', <Requirement('wheel')>, <Version('0.43.0')>)]
saved /home/tt/t/f/sdists-repo/downloads/flit_core-3.9.0.tar.gz
new build-system dependency flit_core<4,>=3.8 resolves to 3.9.0
preparing source for flit_core<4,>=3.8 from /home/tt/t/f/sdists-repo/downloads/flit_core-3.9.0.tar.gz
prepared source for flit_core<4,>=3.8 at /home/tt/t/f/work-dir/flit_core-3.9.0/flit_core-3.9.0
getting build system dependencies for flit_core<4,>=3.8 in /home/tt/t/f/work-dir/flit_core-3.9.0/flit_core-3.9.0
getting build backend dependencies for flit_core<4,>=3.8 in /home/tt/t/f/work-dir/flit_core-3.9.0/flit_core-3.9.0
adding ('flit-core', '3.9.0') to build order
preparing to build wheel for flit_core<4,>=3.8 version 3.9.0
created build environment in /home/tt/t/f/work-dir/flit_core-3.9.0/build-3.12.3
building wheel for flit_core in /home/tt/t/f/work-dir/flit_core-3.9.0/flit_core-3.9.0 writing to /home/tt/t/f/wheels-repo/build
built wheel for flit_core version 3.9.0: /home/tt/t/f/wheels-repo/downloads/flit_core-3.9.0-py3-none-any.whl
getting installation dependencies from /home/tt/t/f/wheels-repo/downloads/flit_core-3.9.0-py3-none-any.whl
installed build-system flit_core<4,>=3.8 using 3.9.0
getting build backend dependencies for wheel in /home/tt/t/f/work-dir/wheel-0.43.0/wheel-0.43.0
adding ('wheel', '0.43.0') to build order
preparing to build wheel for wheel version 0.43.0
created build environment in /home/tt/t/f/work-dir/wheel-0.43.0/build-3.12.3
installed dependencies into build environment in /home/tt/t/f/work-dir/wheel-0.43.0/build-3.12.3
building wheel for wheel in /home/tt/t/f/work-dir/wheel-0.43.0/wheel-0.43.0 writing to /home/tt/t/f/wheels-repo/build
built wheel for wheel version 0.43.0: /home/tt/t/f/wheels-repo/downloads/wheel-0.43.0-py3-none-any.whl
getting installation dependencies from /home/tt/t/f/wheels-repo/downloads/wheel-0.43.0-py3-none-any.whl
found wheel 0.41.2 installed, updating to 0.43.0
installed build-backend wheel using 0.43.0
adding ('setuptools', '70.0.0') to build order
preparing to build wheel for setuptools>=40.8.0 version 70.0.0
created build environment in /home/tt/t/f/work-dir/setuptools-70.0.0/build-3.12.3
installed dependencies into build environment in /home/tt/t/f/work-dir/setuptools-70.0.0/build-3.12.3
building wheel for setuptools in /home/tt/t/f/work-dir/setuptools-70.0.0/setuptools-70.0.0 writing to /home/tt/t/f/wheels-repo/build
built wheel for setuptools version 70.0.0: /home/tt/t/f/wheels-repo/downloads/setuptools-70.0.0-py3-none-any.whl
getting installation dependencies from /home/tt/t/f/wheels-repo/downloads/setuptools-70.0.0-py3-none-any.whl
found setuptools 69.0.3 installed, updating to 70.0.0
installed build-system setuptools>=40.8.0 using 70.0.0
getting build backend dependencies for six in /home/tt/t/f/work-dir/six-1.16.0/six-1.16.0
** handling build-backend requirement wheel [('toplevel', <Requirement('six')>, <Version('1.16.0')>)]
adding ('six', '1.16.0') to build order
preparing to build wheel for six version 1.16.0
created build environment in /home/tt/t/f/work-dir/six-1.16.0/build-3.12.3
installed dependencies into build environment in /home/tt/t/f/work-dir/six-1.16.0/build-3.12.3
building wheel for six in /home/tt/t/f/work-dir/six-1.16.0/six-1.16.0 writing to /home/tt/t/f/wheels-repo/build
built wheel for six version 1.16.0: /home/tt/t/f/wheels-repo/downloads/six-1.16.0-py2.py3-none-any.whl
getting installation dependencies from /home/tt/t/f/wheels-repo/downloads/six-1.16.0-py2.py3-none-any.whl
```

Pretty neat. Fromager created a [simple package repository](https://peps.python.org/pep-0503/) for our wheels:
```
├── wheels-repo
│   ├── build
│   ├── downloads
│   │   ├── flit_core-3.9.0-py3-none-any.whl
│   │   ├── setuptools-70.0.0-py3-none-any.whl
│   │   ├── six-1.16.0-py2.py3-none-any.whl
│   │   └── wheel-0.43.0-py3-none-any.whl
│   ├── prebuilt
│   └── simple
│       ├── flit-core
│       │   ├── flit_core-3.9.0-py3-none-any.whl -> ../../downloads/flit_core-3.9.0-py3-none-any.whl
│       │   └── index.html
│       ├── index.html
│       ├── setuptools
│       │   ├── index.html
│       │   └── setuptools-70.0.0-py3-none-any.whl -> ../../downloads/setuptools-70.0.0-py3-none-any.whl
│       ├── six
│       │   ├── index.html
│       │   └── six-1.16.0-py2.py3-none-any.whl -> ../../downloads/six-1.16.0-py2.py3-none-any.whl
│       └── wheel
│           ├── index.html
│           └── wheel-0.43.0-py3-none-any.whl -> ../../downloads/wheel-0.43.0-py3-none-any.whl
```

We can easily serve that:
```
$ cd wheels-repo
$ python3 -m http.server
Serving HTTP on 0.0.0.0 port 8000 (http://0.0.0.0:8000/) ...
127.0.0.1 - - [10/Jun/2024 16:37:18] "GET / HTTP/1.1" 200 -
127.0.0.1 - - [10/Jun/2024 16:37:18] code 404, message File not found
127.0.0.1 - - [10/Jun/2024 16:37:18] "GET /favicon.ico HTTP/1.1" 404 -
127.0.0.1 - - [10/Jun/2024 16:37:20] "GET /simple/ HTTP/1.1" 200 -
127.0.0.1 - - [10/Jun/2024 16:37:22] "GET /simple/six/index.html HTTP/1.1" 200 -
```

Let's install from our local index inside a local virtual env.
```
$ python3 -m venv ./ve
$ source ./ve/bin/activate
(ve) $ pip3 install -i http://0.0.0.0:8000/simple --trusted-host 0.0.0.0 six
Looking in indexes: http://0.0.0.0:8000/simple
Collecting six
  Downloading http://0.0.0.0:8000/simple/six/six-1.16.0-py2.py3-none-any.whl (11 kB)
Installing collected packages: six
Successfully installed six-1.16.0
```

Using just a few commands, we've rebuilt `six` and all its transitive
dependencies locally and served all those wheels as a PyPI index and
subsequently installed from it.
