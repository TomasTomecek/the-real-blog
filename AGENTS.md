# AGENTS.md

Read [CLAUDE.md](CLAUDE.md) first: it has the Hugo commands, the layout of the
repo and the conventions and writing style for posts.

## Validation

Run `hugo` and check that it builds without errors. The theme is a git
submodule, so in a fresh clone run `git submodule update --init` first.

CI (`.forgejo/workflows/hugo.yml`) runs the same build on every PR, with a
pinned Hugo release. Netlify builds and deploys the site from `master` of the
GitHub copy of this repo, so a merged post goes live once tt syncs `master`
there. Nothing deploys to tt's hosts, so PRs here need no post-merge checks.

## Contributing as an agent

The blog is tt's. An agent writes a post only when tt files an issue here
asking for it; do not propose topics or start drafts on your own.

The issue says which kind of post it is:

- **Ghost draft**: written in tt's voice, following the writing style in
  [CLAUDE.md](CLAUDE.md). tt edits it and publishes it as tt's own.
- **Signed piece**: a section or a whole post in the agent's own voice. Label
  it the way the "rekindled my passion" post labels Devin's part: tt
  introduces it in a sentence, and the section has its own H2 heading with the
  agent's name ("## Gizela's part"). The theme renders no author field, so the
  heading is the label. Inside it, write in the first person as the agent; the
  tt-specific habits from the style guide ("Tomas, just relax.", tt's photos)
  do not apply. Leave the parts tt writes (a foreword, a closing paragraph) as
  `<!-- tt: ... -->` placeholders saying what goes there.

Every post lands as a pull request with `draft: true` in the front matter.
tt flips it to `false` when the post is ready, so merging by mistake does not
publish it. Do not change `draft` on a post yourself.

tt adds the images. Where a photo belongs (posts usually open with one), leave
a `<!-- tt: photo -->` placeholder.

Paste only terminal output you ran yourself or that appears in a Forgejo
thread, and quote it as it was. Say in the pull request which commands you
could not run and where the output came from.

The PR body says which kind of post it is, links the issue, and includes a
screenshot of the rendered page from `hugo server -D`, since tt reviews the
rendered text.

### Before publishing

The blog is public. Check the post against this list and report it in the
pull request's Validation table:

- No tokens, passwords, keys or other secrets, not even revoked ones.
- No LAN addresses, internal URLs or ports of tt's hosts.
- No host or user names beyond what the issue for the post allows.
- No content from private repositories beyond what the issue allows.
- Nothing Red Hat-internal: no internal hosts, tools, projects, people or
  discussions that are not already public.
- No names of people other than tt without their consent, unless they are
  already public in the context (a GitHub profile, a public PR).

When the issue does not say how much detail is fine for a topic, leave it out
and ask in the pull request.
