---
title: "Onboarding packit upstream projects to fullsend (part 1)"
date: "2026-07-21T08:00:00+02:00"
draft: false
tags: ["AI", "Agents", "Packit"]
---

Red Hat Konflux team offers several AI agents via project
[fullsend](https://github.com/fullsend-ai/fullsend/). They triage issues, write
patches, and review PRs (and more!) directly inside GitHub Actions.

In Packit, we've decided to give Fullsend a try and onboard our python gitforge
library [ogr](TBD) to it.

This is my experince with the onboarding process (which is not trivial) and a
first few runs. Buckle up!

As usual, most of the work was done from within a Claude Code session and then
I just let Claude to write the rest of this post.

<img src="/img/moon-july2026.JPG" style="width: 800px;">

<!--more-->

---

*The rest of this post is written by [Claude](https://claude.ai/), Anthropic's
AI assistant. Tomas asked me to help him onboard
[ogr](https://github.com/packit/ogr), Packit's Python library that gives one
API across GitHub, GitLab, Pagure, and Forgejo, to fullsend's triage, coder,
and review agents. What follows is what we ran into getting there, and how
each piece of it eventually got resolved.*

---

## Sizing up the target

`ogr` is a good first candidate for this, and it took about five minutes of
reading the repo to see why: small, well-tested, a genuinely clean
architecture (abstract interfaces in `ogr/abstract/`, per-forge
implementations under `ogr/services/<forge>/`). It's also the kind of issue
tracker a triage agent can be useful on: a lot of "does this work with Forgejo
too" reports, a lot of small PRs that each touch one forge at a time.

We agreed to start with three agent roles, `triage`, `coder`, `review`, and
leave `retro` and `prioritize` alone for now. Building trust with the boring
agents first, before letting anything near backlog grooming, seemed like the
right order of operations.

## How fullsend actually works

Worth explaining, because it's the interesting design decision underneath
everything that follows.

fullsend agents run as GitHub Actions workflows, triggered per repo. No agent
holds a long-lived personal access token sitting in a secret somewhere,
waiting to leak. A component called **mint** issues short-lived credentials
over OIDC, scoped to the specific workflow run asking for them. The agent gets
a token, does its job, the token expires. Nothing to rotate, nothing sitting
in an org secret for two years with more scope than anyone remembers granting.

Inference runs on GCP Vertex AI (Claude models), and the same OIDC pattern
shows up again via Workload Identity Federation: no service account keys on
disk, no JSON credential files. The GitHub Actions runner presents its OIDC
token, GCP trusts it because of a pool and provider set up ahead of time, and
that's the entire exchange.

fullsend used to support an org-wide install mode too. Deprecated now, there's
an internal ADR for it
([ADR 0044](https://github.com/fullsend-ai/fullsend/blob/main/docs/ADRs/0044-deprecate-per-org-installation-mode.md)).
Per-repo is the only supported path going forward, which suited us anyway
since we wanted `ogr` onboarded on its own terms.

[Diagram from fullsend.sh docs.](https://fullsend.sh/docs/architecture.html#abstract-model)
```
event ──► DISPATCHER
          Filters event, selects agent role, dispatches run
                │
                ▼
          ╔═══════════════════════════════════════════════════════╗
          ║ AGENT RUNNER                                          ║
          ║                                                       ║
          ║ Loads harness definition for agent role:              ║
          ║   agent prompt, sandbox image, network policy,        ║
          ║   skills, pre/post scripts, validation config,        ║
          ║   output schema, host files, env vars                 ║
          ║                                                       ║
          ║ Runs pre-script on host:                              ║
          ║   validate inputs, prefetch data                      ║
          ║                                                       ║
          ║ ┌───────────────────────────────────────────────────┐ ║
          ║ │ SANDBOX (ephemeral, per-run)                      │ ║
          ║ │                                                   │ ║
          ║ │ Created with image + network policy.              │ ║
          ║ │ Bootstrapped with agent def, skills, repo code,   │ ║
          ║ │ env vars, host files, security hooks.             │ ║
          ║ │ No credentials present inside this boundary.      │ ║
          ║ │                                                   │ ║
          ║ │ Pre-agent security scan (context injection).      │ ║
          ║ │                                                   │ ║
          ║ │ ┌───────────────────────────────────────────────┐ │ ║
          ║ │ │ AGENT RUNTIME                                 │ │ ║
          ║ │ │                                               │ │ ║
          ║ │ │ LLM tool-use loop:                            │ │ ║
          ║ │ │   read code, edit files, run tests, iterate   │ │ ║
          ║ │ │                                               │ │ ║
          ║ │ │ Boundaries enforced by enclosing sandbox:     │ │ ║
          ║ │ │   network policy, security hooks,             │ │ ║
          ║ │ │   no credentials, filesystem restrictions     │ │ ║
          ║ │ │                                               │ │ ║
          ║ │ │ Produces: modified repo, output artifacts     │ │ ║
          ║ │ └───────────────────────────────────────────────┘ │ ║
          ║ │                                                   │ ║
          ║ └───────────────────────────────────────────────────┘ ║
          ║                                                       ║
          ║ Extracts from destroyed sandbox:                      ║
          ║   output files, reasoning transcripts, modified repo  ║
          ║                                                       ║
          ║ Post-agent security scan (redact secrets from output) ║
          ║                                                       ║
          ║ Validation loop (if configured):                      ║
          ║   schema check on host                                ║
          ║   ├─ pass: continue                                   ║
          ║   ├─ fail + retries remain: re-run agent w/ feedback  ║
          ║   └─ fail + retries exhausted: HARD FAILURE           ║
          ║     (no unvalidated output emitted)                   ║
          ║                                                       ║
          ║ Runs post-script on host (outside sandbox):           ║
          ║   push code, create PR, post comments, apply labels   ║
          ║                                                       ║
          ╚═══════════════════════════════════════════════════════╝
                │
                ▼
          Results applied to external system
```

## Seven steps, not all of them mine to run

Tomas and I worked out seven steps. Some of them I could just run. Others need
credentials or org-owner rights that only Tomas holds, so no amount of agent
access gets around them:

1. Ask the fullsend team on Slack for "mint enrollment" for `packit/ogr`.
   Manual, not self-service. Gates everything downstream since mint is what
   issues the OIDC tokens.
2. Install the fullsend CLI.
3. Provision GCP inference: enable the right APIs, confirm the Claude models
   are available in Vertex AI, then run `fullsend inference provision` to set
   up Workload Identity Federation.
4. Install three separate fullsend GitHub Apps (triage, coder, review) on the
   `packit` org, scoped to just the `ogr` repo. Needs org-owner rights,
   browser only.
5. Run `fullsend github setup` with a fine-grained PAT to generate the
   scaffolding PR that adds the `fullsend.yaml` workflow.
6. Add repo-side agent context: an `AGENTS.md` at the root of `ogr`.
7. Smoke test: open an issue, comment `/fs-triage`, watch the Actions tab.

Steps 1 and 4 were Tomas's alone, no way around that. The rest I could at
least start on.

## The CLI, and an AGENTS.md that's actually true

I pulled `fullsend` v0.32.0 from GitHub releases and dropped it into
`~/.local/bin`:

```
$ fullsend --version
fullsend version 0.32.0
```

Nothing to report, it just worked.

Then I went through `ogr`'s actual `CONTRIBUTING.md`, its tox config, and
`.pre-commit-config.yaml` instead of guessing, and wrote an `AGENTS.md` that
documents what's actually true: the abstract/services split, the factory
pattern in `ogr/factory.py`, `requre` for recording and replaying HTTP
fixtures in tests, `make check` and `make check-in-container`, and the
pre-commit stack (`black`, `ruff`, `mypy`, mandatory SPDX headers). I left it
untracked rather than opening a PR immediately. Not much point merging agent
instructions for agents that can't run yet.

## A GCP permission that lies

Tomas pointed me at a GCP project he already uses for other things,
`itpc-gcp-san-ttomecek-gemini`, which already had Vertex AI enabled with the
Claude models available, and all the obvious APIs (IAM, resourcemanager,
aiplatform) turned on. Looked like the path of least resistance. It wasn't:

```
$ fullsend inference provision packit/ogr --project itpc-gcp-san-ttomecek-gemini
...
ERROR: googleapiclient.errors.HttpError: <HttpError 403 when requesting
https://iam.googleapis.com/v1/projects/itpc-gcp-san-ttomecek-gemini/locations/global/workloadIdentityPools?...
returned "Permission 'iam.workloadIdentityPools.create' denied on resource
(or it may not exist)."
```

Tomas is a member of the `logdetective@redhat.com` group, which is supposed to
grant `roles/iam.workloadIdentityPoolAdmin` on that project. According to IAM,
it does. In practice, the permission wasn't landing when we actually tried to
use it. Either the group binding hadn't propagated yet, or the binding didn't
actually carry that role and someone's IAM policy diagram was lying to us. We
genuinely couldn't tell which.

Meanwhile the two things that only Tomas could do stayed exactly where they
were: the Slack ping for mint enrollment, and clicking "Install" on three
GitHub Apps as org owner. Nothing for me to do on either front.

## A second GCP project, a different kind of wall

Rather than keep fighting `itpc-gcp-san-ttomecek-gemini` and its mysteriously
non-functional permission, Tomas got IT to provision a brand-new project
dedicated to this: `it-gcp-ymir-fullsend`. No legacy bindings, no history,
nothing to get confused about. Or so we thought.

First thing I checked was Tomas's effective IAM permissions on it
(`ttomecek@redhat.com`). Zero direct bindings. Everything flows through the
`jotnar@redhat.com` group, same pattern as before. So I used the Resource
Manager `testIamPermissions` API to see exactly what the group grants, rather
than trust the console's summary view:

```
missing: iam.workloadIdentityPools.create
missing: iam.workloadIdentityPoolProviders.create
missing: iam.roles.create
missing: iam.serviceAccounts.actAs
```

One role looked like it might cover this: `resourcemanager.projectIamAdmin`.
Then I read the fine print and found an IAM Condition attached to it:

```
"Restricts projectIamAdmin to granting only roles/aiplatform.user.
Allows SA owners to enable Vertex AI access for their service accounts
without privilege escalation."
```

That's not a bug, and it's not a propagation glitch like the first project.
Someone designed this project specifically to stop the exact kind of
self-escalation we were attempting. Compare the two failures: project one
failed for a reason we still can't fully explain, a permission IAM insisted
Tomas had that silently didn't work. Project two failed because someone
thought about this precise scenario ahead of time and built a guardrail for
it. Legible and frustrating at the same time, but at least we understood it.

Also, only `aiplatform.googleapis.com` was enabled on the new project.
`iam.googleapis.com` and `cloudresourcemanager.googleapis.com`, both of which
WIF setup needs, weren't turned on yet.

## Asking for the keys

No amount of IAM archaeology was going to get around an intentional guardrail.
So Tomas did the boring thing and asked IT directly for Owner access on
`it-gcp-ymir-fullsend`. It was granted.

I re-ran the permission check afterward. Everything came back green. Enabled
the two missing APIs, double-checked that Vertex AI actually had the Claude
models available in that project (Sonnet 5, Opus 4.6, Haiku 4.5, all there),
and ran provisioning again:

```
$ fullsend inference provision packit/ogr --project it-gcp-ymir-fullsend
...
2026/07/22 14:44:56 granted roles/aiplatform.user to packit/ogr (propagation may take several minutes)
  ✓ WIF infrastructure ready
    WIF Provider: projects/.../fullsend-inf...
```

It just worked. The moral of round two: sometimes the fix for an IAM
permissions maze isn't more debugging, it's finding whoever actually owns the
project and asking for Owner.

## Everything else falls into place

Once inference was unblocked, the rest of the plan stopped being blocked too:

- **Slack mint enrollment** for `packit/ogr`: done, a quick manual ask from
  Tomas to the fullsend team.
- **The three GitHub Apps** (triage, coder, review): installed by Tomas on
  the `packit` org, scoped to just `ogr` (`repository_selection: selected`,
  not org-wide). I confirmed the scoping via the GitHub API rather than just
  trusting the "installed" checkmark in the browser.

## A fine-grained PAT with a blind spot

With a fine-grained PAT Tomas generated, scoped to `packit/ogr` with
Contents/Workflows/Secrets/Variables read-write, PRs read-write, Metadata
read-only, and `GH_TOKEN` exported, I ran `fullsend github setup`. It hit
this:

```
✓ Using existing fork TomasTomecek/ogr
✗ Insufficient permissions to push to repository
Error: cannot push to TomasTomecek/ogr (403 forbidden); ...
```

Looked like a permissions bug. It wasn't. `gh api` confirmed Tomas has full
admin on both `packit/ogr` and his personal fork `TomasTomecek/ogr`. What's
actually going on: fullsend's setup flow pushes a scaffold branch to your
personal fork first, then opens the PR against upstream. A fine-grained PAT's
repository access list is an explicit allowlist, not a wildcard. Scoping the
token to only `packit/ogr` means it has zero access to `TomasTomecek/ogr`, so
the push to the fork gets rejected with a 403 that has nothing to do with
permissions on the repos we actually cared about and everything to do with
the token not being allowed near the fork at all.

Fix: add the fork to the token's repository list too, right alongside
upstream. Re-ran the exact same command.

## A PR built on a seven-year-old branch

`fullsend github setup` ran, and this time it actually created a PR. It
looked wrong immediately: based off Tomas's fork's `main`, not upstream's
default branch, and Tomas hadn't touched his fork's `main` in years. Seven of
them, apparently. The CLI just assumes the fork's default branch is a
reasonable base, which is a fine assumption for a fork you actually use and a
terrible one for a fork you forked once and forgot about.

Tomas filed it upstream as
[fullsend-ai/fullsend#5466](https://github.com/fullsend-ai/fullsend/issues/5466):
`fullsend github setup` uses the fork's `main` as a base instead of
upstream's. He asked whether it's configurable, and suggested it should
default to the target repo's default branch instead. The PR that actually
landed, #993, is clean, just the fullsend scaffold and nothing else, but it's
a rough edge worth knowing about if your fork is as neglected as his.

## The scaffolding PR, reviewed properly

[PR #993](https://github.com/packit/ogr/pull/993), "chore: initialize
fullsend per-repo installation", added:

- `.fullsend/config.yaml`: declares the three roles, an
  `allowed_remote_resources` allowlist scoped to `fullsend-ai/fullsend` and
  `fullsend-ai/agents`, and a `create_issues.allow_targets` scoped to just
  `packit/ogr` and `fullsend-ai/fullsend`.
- an empty `.fullsend/customized/` skeleton (agents, env, harness, plugins,
  policies, profiles, providers, schemas, scripts, skills), all placeholders
  for now.
- `.github/workflows/fullsend.yaml`, the shim workflow.

Worth flagging for anyone who cares about CI security: it uses
`pull_request_target` but never checks out PR code, and it pins the reusable
dispatch workflow it calls to a full commit SHA instead of the `v0.32.0` tag.
That's the standard defense against a "pwn request", a malicious PR that
modifies its own CI workflow to exfiltrate secrets from a privileged trigger.
Nice to see that's not just assumed.

Nobody merged a bot-authored PR without reading it, either.
[Laura Barcziová](https://github.com/lbarcziova) reviewed it properly: was
`OTEL_EXPORTER_OTLP_TRACES_HEADERS` actually mandatory if it's not set anywhere in the repo
yet, why do the workflow's permissions (`actions: write`, `contents: write`,
`issues: write`, `pull-requests: write`) look this broad, and does a labeling
step in the workflow essentially just label the issue, in which case do we
even need it? Fair questions. Tomas dropped the labeling bit, a leftover
default from the scaffold nobody had looked at closely enough. Answering her
also surfaced something worth noting: the workflow only has one job,
`dispatch`, no separate triage, coder, or review jobs. That's by design, per
[ADR 62](https://github.com/fullsend-ai/fullsend/blob/main/docs/ADRs/0062-dispatch-version-skew.md).
The shim forwards the raw event to a reusable `reusable-dispatch.yml`
workflow, pinned by commit SHA, and that workflow decides internally which
stage runs. Adding a new agent stage means a change on fullsend's side, not in
`ogr`. Laura approved: "few comments, but I'm fine with testing this out."

I didn't just trust the CLI's success message either. Checked with
`gh api repos/packit/ogr/actions/variables` and `.../secrets` that the repo
variables (`FULLSEND_GCP_REGION`, `FULLSEND_MINT_URL`,
`FULLSEND_PER_REPO_INSTALL`) and secrets (`FULLSEND_GCP_PROJECT_ID`,
`FULLSEND_GCP_WIF_PROVIDER`) actually existed. They did. PR #993 merged
2026-07-22 at 16:48 UTC.

## A smoke test that turned into a real fix

Step 7 of the plan was supposed to be "open a test issue, comment
`/fs-triage`, see if the bot shows up." Safe, boring, exactly what a smoke
test should be. Instead Tomas pointed it at a real bug.

[Issue #890](https://github.com/packit/ogr/issues/890),
`AttributeError: 'NoneType' object has no attribute 'project'`, had already
stumped a contributor and a maintainer in the thread. The contributor
couldn't reproduce it. The maintainer's best guess was "probably a race
condition... might be hard to reproduce." Exactly the kind of issue where a
triage agent either proves itself or doesn't.

Tomas commented `/fs-triage`.

`fullsend-ai-triage` ran from 4:50 to 4:54 PM UTC and nailed the diagnosis:
`GitlabComment.add_reaction()` crashes when multiple workers try to add the
same emoji reaction concurrently. GitLab returns a `GitlabCreateError`
("Award Emoji Name has already been taken"), and the recovery path for that
error crashes with `AttributeError` because it assumes `self._parent` is set,
except it can be `None`. Severity medium, category bug. Correct on every
count, including the race condition the maintainer had only guessed at.

Then, with no human in the loop, `fullsend-ai-coder` auto-triggered off that
triage and opened [PR #995](https://github.com/packit/ogr/pull/995),
"fix(#890): handle None parent in GitlabComment.add_reaction", four minutes
later:

- Guards the `self._parent` access in the exception handler, falling back to
  the raw GitLab client (`self._raw_comment.manager.gitlab.user.username`) to
  resolve the current user when there's no parent.
- Passes `parent=self` through `get_comment()` in both `GitlabIssue` and
  `GitlabPullRequest`, so comments built through `ogr` always carry a parent
  reference going forward. That's the actual root cause fixed, not just the
  crash site papered over.
- 91 lines of new unit tests in `tests/unit/test_gitlab.py`: the crash
  scenario, the guarded case, and the normal success path.

122 unit tests passed, ruff passed, both gitleaks scans passed (git history
and PR body), pre-commit passed, all inside its own sandbox before the PR
even opened.

From Tomas's `/fs-triage` comment to a tested, passing fix PR: about 13
minutes.

## Where it landed

All seven steps done. `packit/ogr` has live triage, coder, and review agents.
PR #995 is still open, waiting for review like any other contributor's PR
would.
