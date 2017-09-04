---
title: "Flock 2017"
date: 2017-09-08T12:10:24+02:00
draft: false
---

Flock is over. It was nice, good conversations, useful talks and workshops, it
was awesome to see everyone once again. And I liked the location.

The theme of this year's Flock was "do-sessions". It means, less talks and more
workshops, hackfests and discussions. I liked that I could try things and be
part of the discussions, but at the same time, I missed big talks. Also some
talks with similar topics were scheduled at the same time, so one had to make
tough choices.

Here are some of my assorted notes.

<!--more-->

## Keynote
Matt was running his favorite graphs and current state of the art. They were
looking pretty good!

* Fedora 25 and 26 received good feedback and press talked about those releases
  positively.
* Looks like that Fedora is getting more and more installs (26 is bigger than
  25, 25 is bigger than 24).
* Matt introduced well-known projects/initiatives, such as Project Atomic, CI
  initiative, Modularity.
  * Ambassadors should focus on these:
    * https://communityblog.fedoraproject.org/ambassadors-fedora-strategy/
* Graph of contributors is pretty much consistent for ~3 years.


## Factory 2
Mike Bonnet talked about vision of Factory 2 team and introduced basic concepts
of the new tools the team is working on. Most of the tools got a standalone
presentation on their own by their core contributor.

The tools include:

* Module Build Service
* Freshmaker
* Greenwave
* WaiverDB
* ResultsDB
* Arbitrary Branching

The interesting point from Mike's talk was when he tried to present motivation
for all the automation the team is working on:

* There is more than 20.000.000 tasks in koji.
* Latest Fedora release contains 54.000 binary RPMs.
  * Which is 215 RPMs per active maintainer.

I hope it's obvious that humans cannot manage this. Especially with
introduction of modules. Hence all the new tools which will make our lives
easier.


## Freshmaker
* Contains policies to rebuild artifacts.
* And initiates rebuilds of artifacts.
* There are various events one may be interested to rebuild an artifact.
  * E.g. for container images:
    * When RPM hits stable (slower workflow).
    * When RPM (or module) passes tests (faster workflow).


## Greenwave & WaiverDB
* A service for making decisions -- is this artifact good?
* Gating points at certain places, e.g. a test of artifact has finished.
* Gating is based on policies.
* `dist.*` checks, which you may find in bodhi, are Fedora policies.
* WaiverDB is a database of waivers against ResultsDB.


## Arbitrary Branching
* What happens when a module goes EOL?
  * Should there be a dnf plugin to inform the user?
* Arbitrary branches can be used **only with** modules.
  * The maintainer is able to release the module via Bodhi.


## Multi-arch container image build system
Adam Miller talked about the architecture of this system:

* There will be one OpenShift cluster per CPU architecture.
* There will be one additional OpenShift cluster which will orchestrate the builds.

There was a question from audience why not label nodes and use selectors.
Response from Adam was, that upstream team tried to go for this solution, but
realized it would be too hard to implement so they chose the path of multiple
clusters.


## Module build service
Ralph had a nice and short presentation about MBS. The most important part for me were the future plans. Here they are:

* **Build-time filtering**: discard packages (built locally?) which are
  specified in `filter` section of modulemd.
* **Transitive dependencies**: MBS should enable modules, which are defined as
  runtime dependencies of modules listed in buildrequires — the workaround for
  now is to put those modules in buildrequires.
* **Smarter component re-use**: less rebuilds!
* **The context value** (of modulemd): this one is related to the next point —
  context value should distinguish builds which are performed against different
  platforms.
* **Stream expansion**: building a module against multiple platforms.

Here are [Ralph's slides](http://threebean.org/presentations/mbs-flock17/).


## Future of Modularity
Same as MBS talk: the most significant slide was — what's coming?

* **Small human edit —  generated outputs** — I don't recall this one, but I
  hope it could be related to generating modulemds and let humans just polish
  the final recipe.
* **Generate from SRPMs** — is it possible to generate a modulemd from an SRPM?
* **Tool to see the whole ecosystem** — in which module lives package X?
* **Distribution-wide tests** — can this modular distribution be installed?
* **COPR & Varant** to be used for local development and scratch builds.

You can find Langdon's slides over [here](https://www.slideshare.net/langdonwhite/modularity-the-future-building-packaging).


## Modularity UX feedback
This session was up every day. It was interesting to see community members to
go though the workflow of modular dnf. They asked some very good questions and
found several issues (including me!). I think Martin Hatina received a very
solid feedback which he'll be working on next weeks. The main outcome for me
was, when [Sinny Kumari](https://twitter.com/ksinny) asked about a container
image of boltron for different CPU architectures. Obviously we didn't provide
anything like this. So I started working on a guide how to do this locally.
Expect another blog post!


## Let's build a module
This was my workshop. Overall, I received good feedback. Unfortunately we
didn't have enough time to build some real modules, nor was Internet connection
stable enough. The most interesting outcome for me was that people could see
what it takes to create a new module and what the steps are to build it
locally. Clearly, this was confusing to some, since the process of defining
modulemd is not completely straight-forward. There was a lot questions and
fruitful discussion. But in the end, everyone seemed to be on the same page.
Which is awesome. The interesting part is that prior to my session, we were
having pretty advanced discussion about what it would take to modularize the
whole distribution. And after that "complex" discussion, we've got back "to the
roots" of creating roots. It was great to teach everyone the essentials of
creating modules so people now understand what modules really are and how to
make them.
