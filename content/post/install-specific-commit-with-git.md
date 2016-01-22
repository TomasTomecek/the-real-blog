+++
date = "2016-01-22T10:18:21+01:00"
draft = false
title = "Installing python packages from git via pip"
tags = ["git", "python", "pip"]

+++

It may happen that you need to install a python project with pip from git(hub). That's pretty easy:

```
pip install --user -U git+git://github.com/TomasTomecek/sen.git
```

How about a specific commit?

```
pip install --user -U git+git://github.com/TomasTomecek/sen.git@1bfab11eb1ad5183fc0722fb62254adaae5bea14
```

Don't get scared by

```
Could not find a tag or branch '1bfab11eb1ad5183fc0722fb62254adaae5bea14', assuming commit.
```
