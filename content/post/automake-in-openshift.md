---
title: "Automake in OpenShift"
date: 2021-02-12T19:03:45+01:00
draft: false
---

It's Friday evening, 19:00 (7pm) and I just spent more than an hour resolving a
problem in [anaconda](https://github.com/rhinstaller/anaconda/). The problem
was that builds sometimes failed with:

    /bin/sh: /sandcastle/docker-io-usercont-sandcastle-prod-20210212-101715691597/missing: No such file or directory

The irony, right? A file called "missing" is actually missing.

Luckily, I was successful and figured it out. Beer incoming.

<!--more-->


## Prologue

The main reason I am writing this is to record my investigation.

Also to give you a little bit of context. Packit is a CI solution which builds
RPMs of upstream PRs. In case of anaconda, after cloning the repo, packit needs
to initialize files (automake/autoconf) needed to create an archive and then
passes the path to the archive via the last `ls -1` line:
```yaml
actions:
  post-upstream-clone:
    - ./autogen.sh
    - ./configure
  create-archive:
    - "make release"
    - 'bash -c "ls -1 anaconda-*.tar.bz2"'
```


### Before I even started...

...I spoke to a good friend of mine, [Vasek](https://github.com/vpavlin) and he
gave me some pretty good tips: isolate the issue and check what's happening and
why it's happening when it happens.

The main problem was that this only used to happen once in a while - so I knew
it was probably a race condition (spoiler: it wasn't) or a problem in the
filesystem or [EBS](https://aws.amazon.com/ebs/) (spoiler: not even close).

Vasek clearly told me: "since the error happens with the same file all the
time, it's a bug in the application", which I downplayed in my head. But he was
**freakin' RIGHT**!!1!


## Step 1 (initial analysis)

[I Opened the logs and studied
them.](https://prod.packit.dev/srpm-build/13919/logs) (if you look very closely
you can spot the problem and resolve it here :) I couldn't)

[I also opened logs where the build was
passing](https://prod.packit.dev/srpm-build/13976/logs)

I used the power of diff here:

![Diff](/img/anaconda-build-logs-diff.png)

**Observation**  
Most of the lines are the same, except in CI, config.h had to created — interesting.

## Step 2

I opened the generated Makefiles and studied them. And I cried. Because I couldn't understand. A. Thing:
```
distdir-am: $(DISTFILES)
	$(am__remove_distdir)
	test -d "$(distdir)" || mkdir "$(distdir)"
	@srcdirstrip=`echo "$(srcdir)" | sed 's/[].[^$$\\*]/\\\\&/g'`; \
	topsrcdirstrip=`echo "$(top_srcdir)" | sed 's/[].[^$$\\*]/\\\\&/g'`; \
    ...
```

Not something I wanted to do on a Friday evening.

Let's go back to the diff and compare the lines where the error happened.

Good build
```
make  distdir-am
make[5]: Entering directory '/sandcastle/docker-io-usercont-sandcastle-prod-20210212-101851112961/widgets'
:
test -d "../anaconda-35.2/widgets" || mkdir "../anaconda-35.2/widgets"
 (cd src && make  top_distdir=../../anaconda-35.2 distdir=../../anaconda-35.2/widgets/src \
     am__remove_distdir=: am__skip_length_check=: am__skip_mode_fix=: distdir)
```

Bad build:
```
make  distdir-am
make[5]: Entering directory '/sandcastle/docker-io-usercont-sandcastle-prod-20210212-101851112961/widgets'
(CDPATH="${ZSH_VERSION+.}:" && cd . && /bin/sh /sandcastle/docker-io-usercont-sandcastle-prod-20210212-101715691597/missing autoheader)
/bin/sh: /sandcastle/docker-io-usercont-sandcastle-prod-20210212-101715691597/missing: No such file or directory
make[5]: *** [Makefile:430: config.h.in] Error 127
```

(can you see it?)

I went through the makefile and realized the difference is that `config.h.in`
is being generated — that's why the commands differ in the output. Since I
already knew that, it wasn't anything new — only a confirmation. When I removed
`config.h`, I could regenerate it without a problem. What am I missing?


## Step 3

One thing that puzzled me while looking at the generated makefiles was that paths were hardcoded and absolute, e.g.:
```
AUTOHEADER = ${SHELL} /sandcastle/docker-io-usercont-sandcastle-prod-20210212-101851112961/widgets/missing autoheader
```

And that's when all the coffee kicked in. I looked at the error line, letter by letter:
```
...astle-prod-20210212-101851112961/widgets
...astle-prod-20210212-101715691597/missing
```

**TIMESTAMPS ARE DIFFERENT**

Are you f kidding me?!


## Solution

So, whenever config.h needs to be regenerated, the build would fail, because `./autogen.sh` and `./configure` are executed in different sandbox environments. It means that automake will use former paths which are no longer valid once `make release` is being triggered.

Solution? Run `make config.h` after cloning the repo and hope it's gonna work.

https://github.com/rhinstaller/anaconda/pull/3170

