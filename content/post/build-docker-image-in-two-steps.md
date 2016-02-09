+++
date = "2016-02-09T13:12:21+01:00"
draft = false
title = "Building docker images with two Dockerfiles"
tags = ["docker"]

+++

So I got asked about this topic after my DevConf 2016
[talk](https://devconfcz2016.sched.org/event/5lzf/is-it-hard-to-build-a-docker-image):
there is [a
solution](https://github.com/docker/docker/issues/13490#issuecomment-156554857)
available on internets which describes how one can use two dockerfiles to build
an image. Whole article can be found [
here](http://resources.codeship.com/ebooks/continuous-integration-continuous-delivery-with-docker).

What I didn't like about the solution is that the first image outputs whole
build artifact as a tarball to standard output. To me that's a bit hacky. Since
docker 1.8 you can `cp` files and directories between containers and host.
Let's try to do that!

All of this is because of build secrets. It may happen that you need to
authenticate with an external service when building a docker image. In order to
do that, you need to have a secret available during build. That's a problem.
This key may leak into a final image (whether via `docker history` or will be
available directly in some layer).

Here's a solution!

Split your build process into two steps, each step represents its own dockerfile.

1. Authenticate with external service in order to fetch sources (use private
   SSH key to authenticate with GitHub so you can clone a repo) and build the
   project.

2. Get build artifacts from step 1 and install them.

<!--more-->

## Let's do this!

First we need to write a Dockerfile which is able to fetch and build the project:

```dockerfile
FROM fedora:23
RUN dnf install -y git
# this is the private key you DON'T want to get leaked
COPY id_rsa /
# just for the demo; we are not using the key actually
RUN git clone https://github.com/TomasTomecek/sen /project && \
    cd /project && \
    python3 ./setup.py build
    # make clean would make sense here
```

Let's get the key:

```shell
cp -a ~/.ssh/id_rsa id_rsa
```

and don't forget to blacklist the key in `.gitignore`!

```shell
printf "id_rsa\n" >.gitignore
```

Build time!

```
docker build --tag=build-image .
```

We can copy the build artifact from build container now:

```shell
docker create --name=build-container build-image cat
docker cp build-container:/project ./build-artifact
```

You are free to inspect and post-process the artifact:

```shell
ls -lha ./build-artifact
```

Everything is fine? If so, let's build the final image.

```shell
docker build -f Dockerfile.release --tag=sen .
```

Is the key in final image?

```shell
cat ./test-if-key-is-present.sh
if docker run sen test -f /id_rsa
then
  printf "Key is in final image!\n"
  exit 2
else
  printf "Key is not in final image.\n"
fi
```

```shell
./test-if-key-is-present.sh
Key is not in final image
```

Whole solution is available in [this GitHub repo](https://github.com/TomasTomecek/two-step-build).

