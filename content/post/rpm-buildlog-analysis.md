+++
title= "Post-processing RPM build logs"
date= 2022-12-09T10:00:00+01:00
draft= false
tags= ["rpm"]
+++

I'm so happy to write this article. With [Packit](https://packit.dev/) and
[Copr](https://copr.fedorainfracloud.org), we are improving the RPM ecosystem
so much that we can work on User Experience (rather Developer Experience) more
and more. Finally `\o/`

<!--more-->

Context: [Sorin](https://twitter.com/sbarnea) recently [reached
out](https://github.com/fedora-copr/copr/issues/2415) to us that we should
improve readability of RPM build logs by highlighting the cause. Completely
valid request. Although I saw much more in the ask, especially after
[Mirek](http://miroslav.suchy.cz/) recently nudged us to be creative with ideas
what to work on next (= go big).

I completely support Sorin's request. RPM build logs are a pain to process (no
offense to RPM). ALL build logs are a pain to process. They are huge,
unstructured, plaintext, cryptic and unfriendly. If you don't have enough
experience with building RPMs, they are a puzzle.

Pavel's suggestion in the issue was spot on: we could start a tool that
would do the heavy lifting of the log analysis. I like that.

So for my Red Hat day of learning [I started learning machine
learning](https://www.youtube.com/watch?v=7eh4d6sabA0). And thought I would get
a ML PoC done in one day.

Nope. [This article convinced me it's not that
easy](https://www.zebrium.com/blog/part-1-machine-learning-for-logs). Thank
you, Zebrium, whoever you are.

No need to bring ML when we can find patterns using regular expressions in the
logs. Exactly what the mock script does.

So I copied all of that code and started implementing more cases.

https://github.com/TomasTomecek/rpm-loggy

## What's next?

Well, Christmas 2022. 🎄

I won't have time to work on this tool fulltime, it was just a proof of concept.

I'll bring it up in our group and see what to do about it.

Happy holidays!

