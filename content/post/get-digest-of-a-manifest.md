+++
date = "2015-10-05T15:00:00+02:00"
draft = false
title = "How hard is it to get a digest of a docker image's manifest?"

+++

**Update (October 13th)**: The encoding mismatch is made on purpose as described [in this issue](https://github.com/docker/distribution/issues/1065). The current work is present in [this repo](https://github.com/TomasTomecek/digest-of-a-manifest).

So I needed to get a digest of a manifest. Manifest is a text file in JSON format which contains metadata for a docker image. Manifest is part of v2 docker registry API.

We want to have this functionality (`f(manifest) → digest`) in [pulp](http://www.pulpproject.org/) so I needed to do that in python. I guess it would pretty easy to do in Go because I would be able to use code from distribution directly.

<!--more-->

Former work was present in [this gist](https://gist.github.com/TomasTomecek/2bd7cca85ee1a70725fb).

It would have been pretty easy to do, since you just need to compute sha256 hash sum of the manifest. Compute a sum you say? That's a one-liner. Except:

 * you need to remove `signatures` section
 * indentation and whitespace needs to stay (!)
 * order matters (you need to serialize into `OrderedDict`)
 * and most importantly, encoding is messed up

Let's try the latter one. We'll use this dockerfile:

```text
FROM busybox
MAINTAINER My name is wéířĎ "cuz' I like that" <mail@example.com>
LABEL a=ý
```

What an ugly dockerfile!

```
$ docker build --tag=ugly .
...
$ docker run --net=host -v ~/registry:/var/lib/registry --name=registry registry:2
$ docker tag ugly localhost:5000/ugly
$ docker push localhost:5000/ugly
...
latest: digest: sha256:c77d17555213bd215cf3ed079c7a45d05ac859f7fb323a36d8ad0f793adc2453 size: 8807
```

Neat! It's in distribution now. Let's see the manifest:

```
$ curl http://localhost:5000/v2/ugly/manifests/sha256:c77d17555213bd215cf3ed079c7a45d05ac859f7fb323a36d8ad0f793adc2453
{
   "schemaVersion": 1,
   "name": "ugly",
   "tag": "latest",
...
```

Yep. It's manifest. Time to check those weird characters:

```
...
Build\":[],\"Labels\":{\"a\":\"ÃÂ½\"}},
\"docker_version\":\"1.9.0-dev-fc24\",
\"author\":\"My name is wéířĎ \\\"cuz' I like that\\\" \\u003cmail@example.com\"
...
```

Eiwwww. What's that? I typed `ý`, not `ÃÂ½`. And why `<` and `>` are written as unicode? What about docker history?

```
$ docker history --no-trunc ugly
IMAGE          CREATED         CREATED BY                                                                           SIZE
a1480b88c753   7 minutes ago   /bin/sh -c #(nop) LABEL a=ÃÂ½                                                    0 B
99b012efab6a   7 minutes ago   /bin/sh -c #(nop) MAINTAINER My name is wéířĎ "cuz' I like that" <mail@example.com   0 B
```

That's better, but the label still looks pretty bad.

I have created [upstream issue](https://github.com/docker/distribution/issues/1065) for distribution and [another one](https://github.com/docker/docker/issues/16793) for engine.
