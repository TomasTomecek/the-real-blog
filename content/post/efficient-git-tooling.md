+++
date = "2018-04-08T10:27:24+02:00"
title = "Efficient git[hub] tooling"
draft = false
tags = ["git"]

+++

This is a follow-up to my previous blog post: ["My github pull request workflow"](https://blog.tomecek.net/post/my-github-pull-request-workflow/).

I would like to dedicate a complete post on how you can be efficient when using git[hub].

It's certain that you may have your own tips and tricks up your sleeve. Please share them in the comments.

Let's begin!

<!--more-->


## Prereqs

First things first. All of my aliases, scripts and shell functions expect a certain configuration:

1. `origin` is a remote which points to my fork (or a repository directly owned by me).
2. `upstream` remote points to upstream repository.
3. `git` fetches pull requests [of my copies locally](https://github.com/TomasTomecek/dotfiles/blob/e0394d11c1f6294166710b43b98aaadd6b3b4ded/git/.gitconfig#L38).
   For github these live in e.g. `refs/pull/*/head`. You can easily tell git to
   fetch them locally for you as well:

    ```
    [remote "origin"]
    fetch = +refs/pull/*/head:refs/remotes/origin/pr/*
    [remote "upstream"]
    fetch = +refs/pull/*/head:refs/remotes/upstream/pr/*
    ```
    Just add that line to `.git/config` or even directly to `~/.gitconfig`. Therefore pull requests will be available locally on ref `<remote>/pr/<number>`.
4. I have a bunch of scripts which interact with github API. I have my token stored in `~/.github.token`.
5. And finally, some scripts use two libraries: `python3-PyGithub` and `python3-tabulate`.


## Contributing to a project

Imagine a simple scenario: you want to contribute to some project. What do we need to do in order to make that happen? (aside from the code itself)


### We need to fork first

I have a nice [shell function](https://github.com/TomasTomecek/dotfiles/blob/e0394d11c1f6294166710b43b98aaadd6b3b4ded/common.sh#L107) and [a script](https://github.com/TomasTomecek/dotfiles/blob/e0394d11c1f6294166710b43b98aaadd6b3b4ded/bin/gh-fork) for that. All I really do is:
```
$ gh-f fedora-modularity/conu
```

What would happen?

 1. The script would fork https://github.com/fedora-modularity/conu into my account.
 2. Clone it locally to a simple tree-like structure: `./fedora-modularity/conu`.
 3. Configure remotes: origin and upstream.
 4. Set up git to fetch pull requests locally.

The shell function is trivial: it executes the script and then `cd`s to the local clone.

What I especially love is that the script is [idempotent](https://en.wikipedia.org/wiki/Idempotence). I can run it on repositories I already forked/cloned and it sets the repository to the expected state.


### Coding

Now's the fun part, writing the code itself! But let's create feature branch first:

1. `gb feature-branch`, is an alias for `git checkout -b`
2. `<code>`
3. commit with `gc` (an alias for `git commit --verbose` — with verbose flag, you'll see the code you are about to commit in the editor)
4. `<code-some-more>`
5. commit some more (e.g. with `gca` — `git commit --amend --verbose`)
6. or with `gri HEAD~3` (`git rebase --interactive`), when you need to change multiple local commits


### Create a PR

Code is done, we can propose it to upstream:

1. `gp` stands for `git push -u` — with `-u`, we would automatically track our local branch with the newly created remote one in our fork.
2. `gh-pr` is a [neat script](https://github.com/TomasTomecek/dotfiles/blob/e0394d11c1f6294166710b43b98aaadd6b3b4ded/bin/gh-pr) which would create a pull request:
  * It opens an editor where you can edit the PR title and a description. The first line is the title, rest is the body.
  * The script helps you by showing you all of your commits in your local branch.
  * Once you're done, just `:wq` and you can briefly see the metadata of the request: this is just a sanity check before creating it.
  * Last line of the script output is a link to the PR itself.


### Changes after review

Your code is a hit! Upstream loves it, but asks you to do some changes.

1. Let's open a new shell window in our terminal.
2. [Navigate with autojump](https://github.com/wting/autojump) to our local clone: `j conu`.
3. Rebase the PR: `gpum` — `git pull --rebase upstream/master`.
4. Do the changes and `gc`, `gca` or `gri` as needed.
5. And finally `gpf`: `git push --force`.

PR was merged, good job!


## Testing PR locally

Let's assume role of an upstream developer now. Someone sent a PR and you want
to review it. Ideally, our session would be as short as possible, right? Let's
give it a shot:

1. Let's open a new shell window in our terminal.
2. [Navigate with autojump](https://github.com/wting/autojump) to our local clone: `j conu`.
3. List proposed pull requests:
  ```
  $ gh-list-prs                                                                            (master)
  ╒══════╤════════════════════════════════════════════════════════════════════════╤═══════════════╕
  │ #178 │ WIP: check-packaging added to Makefile to verify all packaging methods │ @enriquetaso  │
  ├──────┼────────────────────────────────────────────────────────────────────────┼───────────────┤
  │ #179 │ backend: fake -  null container backend                                │ @jscotka      │
  ├──────┼────────────────────────────────────────────────────────────────────────┼───────────────┤
  │ #187 │ WIP WIP nspawn madness WIP WIP                                         │ @TomasTomecek │
  ├──────┼────────────────────────────────────────────────────────────────────────┼───────────────┤
  │ #182 │ First release candidate for 0.3.0                                      │ @TomasTomecek │
  ╘══════╧════════════════════════════════════════════════════════════════════════╧═══════════════╛
  ```
  * You can see [pretty-git-prompt](https://github.com/TomasTomecek/pretty-git-prompt) on the right side of my prompt.
  * By default, the script lists PRs for the repo you're in, but can also accept an argument.

4. Let's check out the latest PR:
  ```
  $ checkout-pr                                                                            (master)
  Fetching origin
  Fetching upstream
  Switched to branch 'pr/189'
  Your branch is up to date with 'upstream/pr/189'.
  HEAD is now at a2a390d No need to 'RUN mkdir' before COPY
  $ make test                                                                   (pr/189│upstream↓1)
  ```
  Running the script resulted into being on branch `pr/189` which is one commit ahead of upstream/master.

The script should be idempotent. Even if you check out a PR locally, running
the script again in future will give you the latest changes.


## Conclusion

That's it! This is how I github.

I haven't mentioned two really good tools, which I like to use:

1. [tig](https://github.com/jonas/tig) — terminal interface (ncurses) for git
2. [vim-figutive](https://github.com/tpope/vim-fugitive) — git interface done as a vim plugin

All of my scripts are MIT licensed so you can do whatever you want with them. I
suggest copying them 1:1 and adding to your dotfiles or just on `$PATH`.

It would be much better to compile all of them into a single tool. I'm just
lazy to do it right now as it's much easier to edit a script which is already
on your `$PATH` rather than develop a dedicated upstream project.

Happy hacking!
