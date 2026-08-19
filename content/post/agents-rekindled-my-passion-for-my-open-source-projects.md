---
title: "How AI agents rekindled passion for my open source projects"
date: "2026-08-19T19:00:00+02:00"
draft: false
tags: ["AI", "Agents", "Devin"]
---

This is a short story of how thanks to AI agents, I am again passionate about
my open source projects, namely [pretty-git-prompt](https://github.com/TomasTomecek/pretty-git-prompt) (p-g-p in short).

<img src="/img/eclipse2026-sunset.JPG">

<!--more-->

I started that tool a long time ago as a challenge to understand and learn Rust.

After having the initial MVP done, I can retrospect that it took me days/weeks
to accomplish. If I wrote it in Python, it would have taken me hours. And now
with AI agents it would likely be less than an hour. This was happening in
2017.

Now it's 2026 and I barely work on my open source projects. I can safely say
that I do not understand p-g-p's Rust codebase any more and with AI agents, I
have very little incentive to refresh my Rust knowledge.

Earlier this year I was working with amazing folks from Cognition and recently
they were kind to give me one month of Devin Pro for free. So naturally I
headed to p-g-p and asked Devin to review and finish [a stale PR](https://github.com/TomasTomecek/pretty-git-prompt/pull/76), implement some
new features, add CONTRIBUTING.md, add Deepwiki, document release process,
automate the release process, implement more features, ... This would have
taken me *days*. I do not have that free time any more. With Devin it was
literally minutes of my time per PR.

I know AI agents are getting lots of hatred in the open source world because
it's now so trivial to swarm a project with pull requests and security reports.
I do not argue that. In fact, it's definitely a problem in my main work
projects: we just can't keep up with reviews.

For me as an author of several small open projects (mostly CLI tools), I can
say the agents definitely rekindled my passion again (however corny this may
sound).

Here's Devin writing in his own words what work he did on pretty-git-prompt.

## Devin's part

Seven days, 14 pull requests, 11 issues closed. Here's the list.

Pull requests:

- [#76](https://github.com/TomasTomecek/pretty-git-prompt/pull/76) fix conf tests, simplify the Makefile and containers (the stale one, finished)
- [#79](https://github.com/TomasTomecek/pretty-git-prompt/pull/79) add CONTRIBUTING.md
- [#80](https://github.com/TomasTomecek/pretty-git-prompt/pull/80) show the tag pointing at HEAD
- [#81](https://github.com/TomasTomecek/pretty-git-prompt/pull/81) document the upstream release process
- [#82](https://github.com/TomasTomecek/pretty-git-prompt/pull/82) automate releases with a GitHub Actions workflow
- [#83](https://github.com/TomasTomecek/pretty-git-prompt/pull/83) 0.3.0 release
- [#84](https://github.com/TomasTomecek/pretty-git-prompt/pull/84) tag the release commit automatically
- [#85](https://github.com/TomasTomecek/pretty-git-prompt/pull/85) document how to skip pretty-git-prompt in selected repositories
- [#86](https://github.com/TomasTomecek/pretty-git-prompt/pull/86) don't panic when ahead/behind stats are unavailable
- [#87](https://github.com/TomasTomecek/pretty-git-prompt/pull/87) add the `<REMOTE_FIRST_LETTER>` special value
- [#88](https://github.com/TomasTomecek/pretty-git-prompt/pull/88) make `display: surrounded` work on an edge
- [#89](https://github.com/TomasTomecek/pretty-git-prompt/pull/89) tests: use a throw-away global git config
- [#90](https://github.com/TomasTomecek/pretty-git-prompt/pull/90) add `list-colors` and `preview` subcommands
- [#77](https://github.com/TomasTomecek/pretty-git-prompt/pull/77) the git2 0.21 dependabot PR, closed as already handled

Issues:

- [#35](https://github.com/TomasTomecek/pretty-git-prompt/issues/35) failing conf tests
- [#40](https://github.com/TomasTomecek/pretty-git-prompt/issues/40) show tags
- [#36](https://github.com/TomasTomecek/pretty-git-prompt/issues/36) and [#20](https://github.com/TomasTomecek/pretty-git-prompt/issues/20) release automation, arm binaries
- [#70](https://github.com/TomasTomecek/pretty-git-prompt/issues/70) ignore certain git directories
- [#42](https://github.com/TomasTomecek/pretty-git-prompt/issues/42) error when there is no shared history
- [#38](https://github.com/TomasTomecek/pretty-git-prompt/issues/38) first letter of the remote branch
- [#33](https://github.com/TomasTomecek/pretty-git-prompt/issues/33) `surrounded` separator on an edge
- [#18](https://github.com/TomasTomecek/pretty-git-prompt/issues/18) `make test` rewriting your git config
- [#10](https://github.com/TomasTomecek/pretty-git-prompt/issues/10) list colors
- [#12](https://github.com/TomasTomecek/pretty-git-prompt/issues/12) parallelism, benchmarked and closed as not worth it
- [#78](https://github.com/TomasTomecek/pretty-git-prompt/issues/78) sha256 repos, blocked on libgit2, documented and left open

So what actually got better? Three things.

**It stopped misbehaving**: no more panic when there is no shared history with the
remote, `display: surrounded` now works at the edges of a format string, and the test
suite no longer scribbles into your real `~/.gitconfig`.

**It got more useful**: tags pointing at HEAD show up in the prompt,
`<REMOTE_FIRST_LETTER>` keeps multi-remote prompts short, and the new `list-colors` and
`preview` subcommands let you see colors and try a config without touching your shell
setup.

**It became maintainable again**: CONTRIBUTING.md, a documented release process, a
release workflow that tags and publishes on its own (that's how 0.3.0 shipped, with
aarch64 macOS binaries), and green tests that run in a container.

The part I want to flag: not every issue deserves code. #12 asked for parallelism, so I
benchmarked it, found that one `repo.statuses()` call is ~95% of the work, and closed it.
#78 is a libgit2 limitation, so it stays open with the reasoning written down.

How long would this have taken by hand? My estimate is **50 to 70 hours** of focused
human work: roughly 3 to 6 hours per feature or bugfix (reading the Rust, the fix,
tests), a day for the release workflow with its cross-compiled binaries and crates.io
publishing, another day for CONTRIBUTING.md plus the docs, and a chunk for the two
investigations that ended in a comment instead of a patch. Call it two focused work weeks,
or a few months of evenings. Tomas spent minutes per PR.


## Conclusion

Pretty-git-prompt is a simple command line tool with solid test coverage. It's
mindblowing to see that the current generation of LLMs and harnesses excel at
working on projects of this (small) scale.

After this one week I fully understand why Cognition is calling Devin the AI
software engineer. It certainly felt like I hired a software engineer. Devin
not only created pull requests but it also saw things through to completion without me asking for it:
1. Updating pull requests after I did a review
2. Watching a release to land in crates.io and Fedora Linux
3. Inspecting GitHub action runs after we merged his PR

This interaction absolutely blew me away:
<img src="/img/devin-packit.png">

My Packit CI jobs hit an intermittent issue. Devin noticed, fetched logs,
investigated, and correctly **restarted** the jobs. Something I'd expect from a
software engineer to do without telling them.

AI tools can be of immense help when used right. It was trivial to setup Devin
for pretty-git-prompt. Thanks to [Deepwiki](https://deepwiki.com/TomasTomecek/pretty-git-prompt) it navigated the project and the
codebase with a breeze. The real complexity comes when your project suddenly
needs a production deployment, integration and E2E tests that require external
services, and other things that a basic CI job won't satisfy.

Have I turned into a vibecoder? That depends on the definition. p-g-p was my
learning experience of Rust. I don't think my Rust code was ever good. I
totally remember hours I fought the borrow checker. In 2017 there were
definitely times where I didn't care about the code, I just wanted it to
compile and work. It's still the same for me today, I don't need perfect code
for a small CLI tool. Especially in the world where an AI agent can prepare a
performance analysis for me within minutes. Something that would take me hours
to accomplish. I just need for the tool to work the way I expect it to and the
code pass CI tests.
