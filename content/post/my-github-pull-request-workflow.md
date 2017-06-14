+++
date = "2017-06-14T09:30:25+02:00"
draft = false
title = "My GitHub pull request workflow"
tags = ["git"]

+++

My colleague recently asked me how to correctly handle pull requests. Here's
how I'm doing it.

Everything starts with forking a repository so you can push your changes to
your personal fork and then submit them as a pull request. So head over to the
GitHub repository and hit the Fork button.

<!--more-->

Once the repository is forked, you need to clone it:

```shell
$ git clone git@github.com:$GITHUB_HANDLE/$PROJECT.git
$ cd $PROJECT
```

You should also add a remote pointing to the upstream repo so you can update your fork:

```shell
$ git remote add upstream https://github.com/$UPSTREAM/$PROJECT.git
```

I usually set it up via `https://` so I don't accidentally push to upstream when I have permissions.

We can finally start working on our changes. So let's create a feature branch:

```shell
$ git checkout -b the-best-feature
```

Now we will do the changes and commit them. Then we push...

```shell
$ git push -u
```

(This command will push to origin, our fork, and will start tracking the remote branch.)

Back to browser and let's open the pull request.


## We need to update our pull request

Upstream maintainers reviewed your pull request and are requesting changes. At
the same time, it's likely that master branch of upstream repository got
updated and we need to pull the changes. This is how you do that:

```
$ git checkout the-best-feature
$ git pull --rebase upstream master
```

In case there are conflicts, just resolve them and do:

```
$ git add -u
$ git rebase --continue
```

Once the rebase is done, we should update the pull request with the requested
changes. I usually amend existing commits, like this:

```
$ git commit
$ git rebase -i HEAD~3
```

The last command will start interactive rebase -- that's the place where you
can reorder, change, squash commits -- very useful. You should also rebase only
commits you are proposing. Rebasing commits present in upstream will usually
make the pull request un-mergable.

In case you screwed badly, it's easy to recover. Just reset your branch to the
state of upstream master and start cherry-picking commits from the feature branch:

```shell
$ git branch checkpoint-of-the-best-feature
$ git reset --hard upstream/master
$ git cherry-pick ${MY_OLDEST_COMMIT_FROM_THE_CHECKPOINT_BRANCH}
```

As soon as you are okay with the changes, you need to force-push (since you
changed the history):

```
$ git push --force
```

And that's it!


## Optimize!

As you can see, we used tons of commands, arguments, options. I suggest using aliases:

```shell
alias g="git"
alias gp="git push -u"
alias gpf="git push -f"
alias gc="git commit --verbose"
alias gca="git commit --verbose --amend"
alias gpum="git pull --rebase upstream master"
alias gau="git add --verbose --update -- ."
alias gr="git rebase"
alias gri="git rebase -i"
alias grc="git rebase --continue"
alias gb="git checkout -b"
alias grau="git remote add upstream"
```

I even got so far that I created [a script](https://github.com/TomasTomecek/dotfiles/blob/master/bin/gh-fork) to:

1. Fork the repository via GitHub API.
2. Clone the repository.
3. Add upstream remote.
