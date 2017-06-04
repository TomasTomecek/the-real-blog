+++
date = "2017-06-01T11:00:00+02:00"
draft = false
title = "Producing up-to-date container images"
+++

Even though Docker Hub supports automated builds — triggering builds when you
push to a git repository, you still need to actually push to your git
repository in order to get the image build.  That is pretty tedious, to just
update versions and run tests to verify it works. It would be much simpler to
let it update itself automatically and just resolve issues.

<!--more-->

And that's actually pretty easy to do. All you need is GitHub repository,
Docker Hub repository and one script running as a Cron Job in Travis CI. And
that's it.

So let's take a closer look how [I set this up for Rust](https://github.com/TomasTomecek/rust-container/).

1. Travis CI initiates a build every day using its [Cron Jobs](https://github.com/travis-ci/beta-features/issues/1) feature.

2. [This build script](https://github.com/TomasTomecek/rust-container/blob/master/hack/ci.sh) is executed. It's as simple as:
  ```
  mkdir -p ~/.docker && echo "${DOCKER_AUTH}" >~/.docker/config.json
  docker build --tag=$USER/rust .
  make test
  TESTS_PASSED=$?
  if [[ $TESTS_PASSED == 0 ]] ; then
      VERSION=$(docker run $USER/rust rustc --version)
      docker tag $USER/rust tomastomecek/rust:$VERSION
      docker push tomastomecek/rust:$VERSION
  fi
  ```

3. So the image gets built, tested, tagged with correct version and then it's pushed to Docker Hub.

4. Tests verify that
  * Rust compiler is able to compile Rust code.
  * Cargo is able to create a new project.
  * This cargo project can be built.


And that's pretty much it. With such a simple pipeline you get Docker images which are:

 * up to date
 * functional
 * correctly tagged


For implementation details, such as
[Dockerfile](https://github.com/TomasTomecek/rust-container/blob/master/Dockerfile),
[Makefile](https://github.com/TomasTomecek/rust-container/blob/master/Makefile),
[.travis.yml](https://github.com/TomasTomecek/rust-container/blob/master/.travis.yml),
[tests](https://github.com/TomasTomecek/rust-container/blob/master/tests/test_functional.py)
or the precise
[cron job script](https://github.com/TomasTomecek/rust-container/blob/master/hack/ci.sh),
please check my [TomasTomecek/rust-container](https://github.com/TomasTomecek/rust-container) GitHub repository.
