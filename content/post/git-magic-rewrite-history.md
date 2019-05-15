+++
tags = ["git"]
date = "2019-05-15T11:00:00+02:00"
draft = false
title = "Git magic: split repository into two"
+++

We've just hit this point in our project
([packit](https://github.com/packit-service/packit)) that we want to split it
to two repositories: CLI tool and a web service.

I was thinking of keeping the git history for files I want to move to the other
repository. [There is a
ton](https://www.google.com/search?q=git+merge+file+history) tutorials and
guides how to do such a thing. This is what worked for me:

1. Clone the original repository.

2. Have a list of files I want to remove:
  ```
  $ git ls-files >../r
  ```
  Now edit ../r by **removing** entries from the list for files you want to **keep**.

3. Use `git filter-branch` which will remove files from git history we don't
   want in our new repo (using the ../r list):
  ```
  $ git filter-branch -f --tree-filter "cat $PWD/../r | xargs rm -rf" --prune-empty HEAD
  ```

That's it, enjoy git history without files you don't care about.
