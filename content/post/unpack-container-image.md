+++
date = "2018-04-14T10:50:41+02:00"
title = "Unpack container image using docker-py"
draft = false
tags = ["docker", "containers", "python"]

+++

This is just a quick blog post. I've seen [a bunch](https://github.com/docker/docker-py/search?utf8=%E2%9C%93&q=extract&type=Issues) of questions on
[docker-py](https://github.com/docker/docker-py)'s issue tracker about how to extract a container image using
docker-py and [get_archive](https://docker-py.readthedocs.io/en/stable/containers.html#docker.models.containers.Container.get_archive) (a.k.a. `docker export`).

<!--more-->

Here's what I'm doing:
```python
import subprocess
import docker

container_image = "fedora:27"
path = "/var/tmp/container-image"
docker_client = docker.APIClient(timeout=600)
container = docker_client.create_container(container_image)
try:
    stream, _ = docker_client.get_archive(container, "/")

    # tarfile is hard to use
    os.mkdir(path, 0o0700)
    logger.debug("about to untar the image")
    p = subprocess.Popen(
        ["tar", "--no-same-owner", "-C", path, "-x"],
        stdin=subprocess.PIPE,
    )
    for x in stream:
        p.stdin.write(x)
    p.stdin.close()
    p.wait()
    if p.returncode:
        raise RuntimeError("Failed to unpack the archive.")
finally:
    docker_client.remove_container(container, force=True)
```


Pretty easy, right?

