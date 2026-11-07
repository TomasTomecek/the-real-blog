# AGENTS.md

Read [CLAUDE.md](CLAUDE.md) first: it has the Hugo commands, the layout of the
repo and the conventions and writing style for posts.

## Validation

Run `hugo` and check that it builds without errors. The theme is a git
submodule, so in a fresh clone run `git submodule update --init` first.

CI (`.forgejo/workflows/hugo.yml`) runs the same build on every PR, with a
pinned Hugo release. Netlify builds and deploys the site from `master`; nothing
deploys to tt's hosts, so PRs here need no post-merge checks.
