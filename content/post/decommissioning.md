---
title: "Decommissioning an old project feels odd"
date: 2022-05-31T08:00:00+01:00
draft: false
tags: []
---

I recently [finished decommissioning an old
project](https://lists.centos.org/pipermail/centos-devel/2022-May/120371.html)
of ours: CentOS Stream 8 source-git repositories.

It was one of the weirdest tasks I have done in my career.

Why?

<!--more-->

## Removing, not adding

My main task was to remove ~1500 git repositories that almost no one used for
more than 12 months.

That wasn't my typical assignment. I am used to work on new features,
resolving problems, getting feedback; not removing content. That felt just
weird to me. I had to constantly remind myself I am doing the right thing and
that's what we decided to complete.


## No CI

Developers of 2022 are so used to Continuous Integration (and that's a good
thing!), tests and peer review. But if your task is to literally delete a
GitLab project - there is no CI for that. If you screw up and drop a wrong
repo, some teams may not be able to produce any work. And will hate you, a lot.
That's why I spent tenths of minutes looking at my python script, re-running it in
dry-run mode, even with debugger on (!), just to be sure it does what I want it
to do.


## More subtasks than expected

I original scoped the story to:

1. Announce what we want to do
2. Drop the repos
3. Announce it's done

Thanks to my colleague [Hunor](https://github.com/csomh) who suggested a dozen
more subtasks: disable the backend service, archive related repos, deprecate
outdated research, clean up secrets and deployment stuff... It turned out to be
more complex than I originally expected.

Once I finished, [Jirka](https://github.com/jpopelka) dropped even more stuff
that was suddenly not needed.

Lesson learnt: always work with your team when a complex story is ahead: you
may miss something that your peers notice.


## Looking forward instead of backward

I am glad we can now fully focus on our current future goal: having source-git
workflow available in Fedora Linux and CentOS Stream 9. Source-git repos for
Stream 8 didn't work because of the nature of its relationship with RHEL 8.
With Stream 9 we can focus on the endgame, not just some temporary solution.

This was a hard decision to do, and even harder to defend from leadership.
Thanks to the open discussion with all the parties, it was clear what we are
doing and why we are doing it.

I learnt my lesson here to focus on doing the right thing instead of doing
what's easy and convenient.


## Conclusion

It's okay to decommission a project that is not working as expected: learn from
that experience and apply the knowledge to its successor.

Be open when communicating: everyone wants a win:win situation. If it's hard,
you'll value that accomplishment even more.

Work with your team, ask for their help, opinions, suggestions. They are your
partners in crime - allow them to help you.


Onto next adventures!

