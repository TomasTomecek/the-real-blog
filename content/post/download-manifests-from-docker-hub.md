+++
date = "2016-06-13T12:20:46+02:00"
draft = false
title = "Download manifests from Docker Hub"

+++

So we needed to fetch manifests of repositories from Docker Hub today. It's not
that hard. 30 lines of `python` can do it. But at the same time, you need to read
docs with all the specs.

<!--more-->

### Authentication

The biggest pain. `pull` seems to be a privileged operation which requires
authentication. Luckily you only need to obtain a token:

```
repo = "library/fedora"
login_template = "https://auth.docker.io/token?service=registry.docker.io&scope=repository:{repository}:pull"
token = requests.get(login_template.format(repository=repo), json=True).json()["token"]
```

This is documented nicely [here](https://docs.docker.com/registry/spec/auth/token/).


### API call for getting the manifest

That one is documented over [here](https://docs.docker.com/registry/spec/api/#manifest).

```
GET /v2/{repository}/manifests/{tag}
```

Nothing really to talk about: just fetch manifest of requested repository.

```
get_manifest_template = "https://registry.hub.docker.com/v2/{repository}/manifests/{tag}"
manifest = requests.get(
    get_manifest_template.format(repository=repo, tag=tag),
    headers={"Authorization": "Bearer {}".format(token)},
    json=True
).json()
```

Pretty simple, right?


The whole script is available in [this github repo](https://github.com/TomasTomecek/download-manifest-from-dockerhub).


Happy hacking!

