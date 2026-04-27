---
title: "Deploying agents to OpenShift, again (part 1)"
date: "2026-04-27T08:00:00+02:00"
draft: false
tags: ["AI", "Agents", "OpenShift"]
---

We have a set of agents to work on packages in RHEL and CentOS Stream: [packit/ai-workflows](https://github.com/packit/ai-workflows).

They were already running pretty well in an OpenShift cluster last fall. Now we switched clusters so I worked on deploying them, again.

<img src="/img/sunset2026.JPG" style="width: 800px;">

<!--more-->

I used Claude Code exclusively to ask questions and debug issues, though it
didn't run a single `oc` command. It definitely sped up the process a lot
since I didn't have to go to the browser: one tmux window with 2 panes: one with
Claude Code, the other for me to run `oc` commands.

The rest of the text is Claude's summary of our adventures. A chronicle of deploying an AI workflow stack to a fresh OpenShift cluster — what we learned, what surprised us, and how we solved it. Written collaboratively by Tomas Tomecek and Claude.

---

## Chapter 1: The Default StorageClass Surprise

We needed persistent volumes. We checked `oc get storageclass`. There was a default — `rh-internal-nfs`. Looked good.

```
Error: admission webhook "storage-admission-webhook.foobar.redhat.com" denied the request
```

It turned out the default storageclass is blocked by an admission webhook on this cluster. The webhook doesn't surface this information anywhere — `oc describe storageclass rh-internal-nfs` gives nothing suspicious.

The fix: use `netapp-nfs` instead. The lesson: always test storage with a throwaway PVC before a full deploy. It saves time and avoids surprises mid-deployment.

---

## Chapter 2: The Route Admission Webhook

Creating routes via YAML is usually straightforward. Not this time:

```
Internal error occurred: failed calling webhook "v1.route.openshift.io":
Post ... : nil pointer dereference
```

The admission webhook for routes was crashing with a nil pointer dereference — a platform-level issue outside our control. After investigating and ruling out annotation-related causes, the pragmatic path forward was to create the route manually via `oc create route edge` instead. Simple and reliable.

---

## Chapter 3: Docker Hub Rate Limits

We swapped to a colleague's Phoenix image hosted on Docker Hub. Running `oc import-image` returned:

```
Import failed (InternalError): toomanyrequests: You have reached your unauthenticated pull rate limit.
```

Clusters pull images anonymously by default, and Docker Hub rate limits unauthenticated requests. We moved the image to quay.io to work around this. A good reminder to prefer quay.io for images used in cluster deployments.

---

## Chapter 4: ImageStream Apply ≠ Image Import

After applying the MCP server ImageStream, the pod came up but immediately hit `ImagePullBackOff`. The internal registry had no image.

`oc apply -f imagestream.yml` creates the ImageStream *definition* — it does not pull the image. A separate `oc import-image <name> --all` call is needed to trigger the actual import into the internal registry.

We added an `import_image()` helper to `deploy.sh` and called it after every imagestream apply. Worth documenting for anyone working with ImageStreams for the first time.

---

## Chapter 5: Private Image Authentication

```
Import failed (Unauthorized): you may not have access to the container image
"quay.io/tomastomecek/mcp-gateway:latest"
```

The image was private and the cluster had no credentials for it. Two clean options exist: create a pull secret with a robot account token, or make the repository public. We went with the public route for simplicity during the initial deployment.

---

## Chapter 6: The Internal Registry and a Harmless Conflict

Pushing a local image directly to the cluster's internal registry requires an external route to be exposed — something that needs cluster admin access. For those without admin rights, the straightforward alternative is to push to quay.io and update the ImageStream to point there.

While deploying the BeeAI agents, `oc import-image` returned an alarming-looking error:

```
Error from server (Conflict): Operation cannot be fulfilled on
imagestreamimports.image.openshift.io "beeai-agent": the object has been
modified; please apply your changes to the latest version and try again
```

This turned out to be a harmless race condition — the ImageStream's scheduled import policy happened to run at the same moment as the manual import. Retrying the command immediately resolved it.

---

## Chapter 7: Firewall Rules for External Services

With the agents up and running, the first real task landed in the queue. The triage agent picked it up and attempted to connect to Jira:

```
ToolError: Failed to get Jira data: Connection timeout to host
https://redhat.atlassian.net/rest/api/3/issue/RHEL-13333337
```

These cluster nodes don't have outbound internet access by default. Every external service the agents rely on — Jira, GitLab, GitHub, Fedora, COPR, GNU Savannah — requires an explicit firewall rule. We compiled the full list of required domains and submitted a ticket to IT to get the rules opened.

Good news: the agents were working correctly. The infrastructure just needed to catch up.

---

## Chapter 8: The Great Repo Reorganization and Its Rebase Aftermath

While the `deployment-fixes` branch was living its best life — fixing Kerberos config, tweaking OpenShift objects, dropping Loki targets — main was quietly reorganizing the entire project layout.

The old structure had a top-level `mcp_server/` directory and a `common/` directory. The new structure folded everything under `ymir/`: sources moved to `ymir/tools/` and `ymir/common/`. A clean, sensible change on its own. But `deployment-fixes` had 15 commits on top of the old layout, and it was time to rebase.

```
error: could not apply bbea240... configure our krb kdc in mcp container
```

The first conflict landed in `Containerfile.mcp`. The `COPY` instructions were using the old paths:

```
<<<<<<< HEAD
COPY ymir/tools/ /home/mcp/ymir/tools/
COPY ymir/common/ /home/mcp/ymir/common/
=======
COPY mcp_server/ /home/mcp/mcp_server/
COPY common/ /home/mcp/common/
COPY files/ipa_redhat_com /etc/krb5.conf.d/ipa_redhat_com
>>>>>>> bbea240
```

This one was straightforward to resolve: keep the new paths from HEAD, carry over the Kerberos config `COPY` line from the patch. Three-way diff, clear intent, done.

Then `.secrets.baseline` showed up.

`detect-secrets` is a pre-commit tool that scans the repo for accidental credential leaks and records every finding — file path, secret type, hash, and **line number** — in a JSON baseline file. The line numbers are the problem. Every commit in the `deployment-fixes` branch that touched an OpenShift YAML shifted a line number somewhere in a deployment file, which shifted the corresponding entry in `.secrets.baseline`, which produced a conflict.

That conflict appeared three separate times across the rebase — once per commit that had modified an OpenShift YAML. Each time, the conflict looked identical: a handful of `line_number` values differing by 2–3 lines between HEAD and the incoming patch, plus a `generated_at` timestamp disagreement. Nothing semantically meaningful; pure line-number drift.

```
<<<<<<< HEAD
        "line_number": 84,
        "is_secret": false
||||||| parent of be9b03f
        "line_number": 81
=======
        "line_number": 83
>>>>>>> be9b03f
```

The resolution each time: take HEAD's version. It was the most complete (newer entries, `is_secret: false` fields added, more recent timestamp), and the line numbers in the incoming patches were relative to a base that no longer existed anyway.

Five conflicts, four files, 15 commits rebased. The rebase finished cleanly.

The lesson: auto-generated files that embed line numbers — secrets baselines, coverage reports, lock files with content hashes — are rebase landmines. They conflict not because anyone disagreed, but because two independent changes happened to land near each other in the same file. The fix is always the same: regenerate the file from scratch after the rebase, rather than trying to merge stale snapshots.

### The Other Side of the Reorganization: Tests That Pointed at a Ghost

The code move wasn't entirely finished when the rebase landed. `mcp_tools` — an async context manager for connecting to MCP gateways — had been refactored in `ymir/common/utils.py` with a new retry loop, and the retry logic called a helper function named `_is_connection_error`. That function appeared nowhere in the file. The code compiled fine (Python doesn't check call targets at import time), but it would blow up the moment `mcp_tools` actually caught an exception.

At the same time, a request came in to convert the test suite from `unittest.mock` to `flexmock`. Opening `ymir/common/tests/unit/test_utils.py` revealed two distinct halves: Kerberos ticket tests that already used `flexmock` for most things, and a freshly added block of `mcp_tools` retry tests that used `unittest.mock` throughout and — more revealingly — patched `agents.utils.sse_client`, `agents.utils.ClientSession`, and `agents.utils.MCPTool`. There was no `agents/utils.py` source file anywhere in the repo. Only a compiled `.pyc` remained in `__pycache__`, a fossil from a previous layout.

The picture became clear: code that used to live in `agents/utils.py` had been moved to `ymir/common/utils.py`, but the tests had been written against the old address and never updated.

Three things needed fixing before the mocking conversion could even begin:

1. Define `_is_connection_error` in `ymir/common/utils.py` (it was already being called there).
2. Add `import httpx` to the same file (the function checks for `httpx.ConnectError`).
3. Update all the patch targets from `agents.utils.*` to `ymir.common.utils.*`.

With the code in order, the mocking conversion itself surfaced a sharp difference in philosophy between the two libraries.

`unittest.mock.AsyncMock` is generous. Call it, and you get an object that pretends to be an async function. Await it, and you get another `AsyncMock`. Access any attribute on it, and that attribute is also an `AsyncMock`. You barely have to think.

`flexmock` is explicit. It mocks what you tell it to mock, and nothing else.

The first pattern to replace was `AsyncMock(return_value=x)()` — a small trick used throughout the Kerberos tests to hand a pre-cooked coroutine to a flexmock `.and_return()` call. The replacement was a two-line module-level helper:

```python
async def _coro(val):
    return val
```

Every `AsyncMock(return_value=x)()` became `_coro(x)`. Tedious to replace across 30-odd call sites, but each instance was mechanical.

The `make_sse_cm` and `make_session_cm` factory functions were more interesting. The original code built fake async context managers by creating a `MagicMock()` and then setting its `__aenter__` and `__aexit__` attributes to `AsyncMock` instances. `MagicMock` cooperates with this because it lets you assign anything to any attribute. `flexmock` doesn't work that way — you can't just bolt async dunder methods onto a flexmock object. The solution was to replace the factories with real classes:

```python
class _SSEContextManager:
    def __init__(self, exc=None):
        self._exc = exc

    async def __aenter__(self):
        if self._exc:
            raise self._exc
        return flexmock(), flexmock()

    async def __aexit__(self, *args):
        return False
```

Explicit, readable, and — unlike `MagicMock` with grafted-on attributes — something Python actually understands as an async context manager.

The `patch()` blocks converted to `flexmock` module mocking. Instead of temporarily replacing `agents.utils.sse_client` at test time, we flexmocked the module directly:

```python
flexmock(_ymir_utils).should_receive("sse_client").once().and_return(make_sse_cm())
```

Call count assertions that previously lived after the test body — `assert sse_mock.call_count == 1`, `mock_sleep.assert_not_called()` — moved into the setup as `flexmock` expectations: `.once()`, `.twice()`, `.times(3)`, `.never()`. Flexmock verifies them at teardown automatically. Less boilerplate, and failures point at the right place.

The conversion ran 82 tests green on the first try. Then two failures:

```
FAILED test_mcp_tools_success_on_first_attempt - AttributeError: 'MockClass' object has no attribute 'initialize'
FAILED test_mcp_tools_retries_once_then_succeeds - AttributeError: 'MockClass' object has no attribute 'initialize'
```

`mcp_tools` calls `await session.initialize()` right after entering the `ClientSession` context. The original `make_session_cm` used `AsyncMock()` as the session object, and `AsyncMock` auto-generates any attribute you access on it. The flexmock session — a bare `flexmock()` — had no such magic. One line fixed it:

```python
async def __aenter__(self):
    session = flexmock()
    session.should_receive("initialize").and_return(_coro(None))
    return session
```

84 tests passed. The ghost was gone.

---

## Epilogue

```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

Two days, more than seven surprises, one running stack, though we still need to open those firewall rules. Every issue taught us something useful about the platform — and it's all documented here so the next deployment goes smoother.

