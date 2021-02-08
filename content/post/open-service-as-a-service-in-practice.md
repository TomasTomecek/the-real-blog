---
title: "Open Service as a Service in Practice"
date: 2021-02-08T17:59:16+01:00
draft: false
---

This is a follow-up to [the open-source-as-a-service blog
post](https://github.com/stefwalter/blog/pull/1) of a friend and a colleague of
mine, [Stef Walter](https://github.com/stefwalter).

TL;DR of Stef's article is that open source services are hard to contribute to.
Any first-time contributor is probably having hard times to try changes locally
in the same way the service is deployed in production.

Imagine that you'd be able to contribute to GitHub and try your change in some
playground moments later you opened your PR. Freakin' awesome, right?! I
strongly advise you to read Stef's blog post to understand this concept further.

In this article I'd like to discuss the practical side of this - how can one
actually achieve such glorious service contribution model?

<!--more-->

Please don't expect to get an end-to-end guide here - that would take a book to
write, instead I'd love to point you to the right direction.


## How do I even start?

The beginning of your journey should be to set goals: clearly define your
milestones (ideally with acceptance criteria) and start working towards that
goal.

Let's say our end-goal is

    All changes proposed against project's repositories are deployed to a
    playground where contributors can try them out.

That's our final milestone. Let's define goals leading up to it:

0. The service can be deployed reliably within any OS.
1. A contributor can deploy a change locally by running only a single command.
2. The playground is identified and set up.
3. A bot listens to merged PRs on all projects and deploys them to the
   playground.
4. A bot listens to new PRs on all projects and deploys them to a new
   playground instance.
5. A bot posts a link to a pull request once the contribution is deployed in
   the playground.

One note here is that certain milestones can have requirements: you may state
that a certain container engine needs to be available to achieve a milestone.


## Asking again: how do I start?

I'm sure the list above can be intimidating. The technology that helped us to
get rid of the despair was [containers and OpenShift](https://openshift.com/).
That's what the item 0) is about - be able to build container images of your
service no matter the developer's OS.

Now it should be more clear how we can achieve the end-goal.


## What tools do I use?

The main tool which will help you is... Automation!

If you need to do manual steps to achieve parts of the development workflow,
it's just a burden which is holding you back to progress further. The
automation doesn't need to be perfect - in fact, it will never be, just make
sure it's implemented, you can always improve it with spending further
development cycles on it once you are aware of the main drawbacks.

Actual tooling? Whatever fits you and your team: e.g. we are using
[Ansible](https://ansible.com) to achieve most of the automation paired with
[OpenShift
Jobs](https://docs.openshift.com/container-platform/4.6/nodes/jobs/nodes-nodes-jobs.html)
and expanding into [GitHub
actions](https://github.com/features/actions).

Some (Red Hat) teams are using [Argo CD](https://argoproj.github.io/argo-cd/),
[Tekton](https://github.com/tektoncd) and [Kustomize](https://kustomize.io/).
Make sure to do your research and pick tooling which is best for your use
cases.

The principle remains the same though: use continuous integration to verify the
change passes automated tests and continuous delivery for users and developers
to try the change before (or after) it's merged.


## Last words

This is really hard. We already did [an
analysis](https://github.com/packit/research/tree/main/deploy-packit-pr) how to
achieve this contribution model for our project, [packit](https://packit.dev/),
and the task list is pretty long. On the other hand, the payoff is
mind-blowing: anyone can open a PR against a repo in our project and be able
to play with it once it's deployed - without even knowing how to deploy our
service. I would use it all the time when working on our project.

Happy hacking and best of luck!

