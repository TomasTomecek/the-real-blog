---
title: "Always, read, error, messages"
date: 2022-06-19T00:00:00+01:00
draft: false
tags: ["networks"]
---
Carefully.

And think about them, Tomas! After you're done, interpret them.

`/noted`

Okay, less [poetry](https://en.wikipedia.org/wiki/Poetry), more science.

This is a short story on how I spent a few hours trying to renew a [Let's
Encrypt](https://letsencrypt.org/) certificate for my home server. And kept on
failing. Until I succeeded and learnt a lesson (which is in the `$title`).

<!--more-->

I am actually feeling a little poetic (probably since I finished watching [No
Safe Spaces](https://www.imdb.com/title/tt8363914/)). I'm not gonna write this
as a story, instead I'll take it backwards.


## The problem

I couldn't renew an LE certificate on my home server because of this error message:

    Detail: 94.112.xxx.xx: Fetching http://xxx.tomecek.net/.well-known/acme-challenge/xxxxxxxx...: Timeout during connect (likely firewall problem)


## The solution

It was a firewall problem. On my fancy
[Turris](https://www.turris.com/en/omnia/overview/) router. The router did not
tell me in any way that it is blocking a connection. It just did. When I turned
"the threat protection" off, I was able to renew the cert.


## Warning signs

There were clear warning signs this is indeed a firewall problem and not IPv6,
DNS, certbot, [boulder](https://github.com/letsencrypt/boulder/pull/6159),
Server OS (Fedora Linux), my ISP, NAT, fire ants.

1. Connections were successfully routed from the outside in.

2. The verification protocol did not halt initially, but after a few requests.

3. There wasn't much change in my infra since the last cert refresh.


## Lesson learned

It helped me the most to visualize the problem, isolate it, obtain as much info
as possible and conclude.

When I rooted out all external factors, I was left with my server and my
router. That's when it hit me.

A different take on the same problem via
[tweets](https://twitter.com/TomasTomec/status/1535723572353810434?cxt=HHwWhIC-tfqc_s8qAAAA).

