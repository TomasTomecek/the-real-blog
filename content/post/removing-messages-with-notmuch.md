+++
date = "2017-02-07T13:39:17+01:00"
draft = false
title = "Removing messages with notmuch"
tags = ["linux", "notmuch", "mbsync", "isync"]
+++

**Disclaimer: this is very likely not safe, use it at your own risk, I don't account for any harm.**

So you [can't remove messages](https://notmuchmail.org/special-tags/) with notmuch:

```text
While notmuch does not support, nor ever will, the deleting of messages...
```

That's a fact. But what if it could help you with that? A lot actually.

<!--more-->

I reached my quota. And there was no way to remove messages in bulk with standard web interface (I wanted to get rid of ~30k messages). The filter I wanted to use was quite simple:

```text
Everything older than one year from these folders.
```

This is where notmuch excells!

So I tagged the mail for deletion:

```shell
$ notmuch tag +deleted date:..1.5year folder:chatty-mailing-list
```

So we know now what we want to delete. Let's proceed to `mbsync` part. And this
is where it gets messy and dangerous. I definitely advise to turn off any mail
synchronization. So there are no race conditions in-place.

First set `Expunge` to `Both` since you want to remove your remote mail.

Time for some [maildir flags magic](https://cr.yp.to/proto/maildir.html): if
you flag your mail with `T`, it means it's suppose to be trashed. Our mail
server actually removes it right away. So let's trash:

```shell
$ for x in $(notmuch search --output=files tag:deleted) ; do mv $x ${x}T ; done
```

It seems simple, but it's definitely not safe b/c it is expected that message
file ends with `2,`, so please make sure the filenames look like this:

```shell
/home/me/.mail/chatty-mailing-list/cur/1437473681.4267_139480.host,U=13261:2,
```

so you can trash them by turning them into

```shell
/home/me/.mail/chatty-mailing-list/cur/1437473681.4267_139480.host,U=13261:2,T
```

Run `mbsync`, it will propagate the deletion and... That's it.

This has worked for me, I hope it will work for you. Just make sure what you're
doing before running any potentially destructive commands.

Is there a better way? I think so. Please suggest in comments.

