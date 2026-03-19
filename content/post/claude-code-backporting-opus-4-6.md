---
title: "Backporting code with Claude Code Opus 4.6"
date: "2026-03-19T08:00:00+02:00"
draft: false
tags: ["AI", "Agents"]
---

In the Fall of 2025 we've experimented with AI agents backporting upstream patches to CentOS Stream. For more info feel free to read:
- [First test of Claude Sonnet 4.5 for an agent that backports a patch]({{< ref "agentic-ai-claude-sonnet-4-5.md" >}})
- [More reliable agents]({{< ref "more-reliable-agents.md" >}})
- [Backporting upstream patches with Code Assistants]({{< ref "backporting-with-coding-agents.md" >}})

There was one backport that served as "the final boss": CVE-2025-59375 in expat. The upstream fix has 19 commits and changes almost 1000 lines. The models back then couldn't handle this for Stream 9 where the drift in code was severe. I recall the backporting process halting several times with a message saying "this is too complex, a human developer with an IDE should do this work".

It's March 2026, let's try to do this with Claude Code, imperfect prompt, and Opus 4.6.

<!--more-->

TL;DR: it worked, `/context/` stats:
```
  ⎿  Context Usage
     ⛀ ⛁ ⛁ ⛁ ⛀ ⛀ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁   claude-opus-4-6[1m] · 168k/1000k
     ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶    okens (17%)
     ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶   Estimated usage by category
     ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶   ⛁ System prompt: 3k tokens (0.3%)
     ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶   ⛁ System tools: 18k tokens (1.8%)
     ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶   ⛁ Memory files: 1.7k tokens (0.2%)
     ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶   ⛁ Messages: 139.8k tokens (14.0%)
     ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶   ⛶ Free space: 805k (80.5%)
     ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶   ⛝ Autocompact buffer: 33k tokens
     ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛝ ⛝ ⛝ ⛝ ⛝ ⛝ ⛝                         (3.3%)
```

Claude brewed this beer for more than 40 minutes:
```
✻ Brewed for 40m 21s
```

In the next section Claude will describe all the issues.

## Main issues during the backport (written by Claude)

### The Playbook Wasn't Perfect

The playbook was detailed — over 200 lines covering investigation, cherry-pick methodology, spec file updates, and verification. But it had gaps that only surface when you actually do the work:

- It assumed `%autosetup` but expat uses manual `%setup` with `pushd ..` and per-patch `%patch` lines
- It didn't warn about `XML_GE` — a macro introduced in expat 2.6.0 that doesn't exist in 2.5.0
- It didn't mention that upstream split tests into `basic_tests.c`, `nsalloc_tests.c`, and `alloc_tests.c`, while 2.5.0 has everything in a monolithic `runtests.c`
- It said nothing about `XML_TESTING`, a build flag that controls function visibility in newer versions but doesn't exist in 2.5.0

Claude had to discover all of this by reading code, hitting errors, and adapting.

## Three Builds to Get It Right

The first build attempt failed at link time:

```
undefined reference to `set_subtest'
undefined reference to `expat_malloc'
```

`set_subtest` was a test helper that doesn't exist in 2.5.0's framework — easy fix, just remove the call. But `expat_malloc` was more interesting: the upstream code gates these functions behind `#if defined(XML_TESTING)`, making them `static` when the flag isn't set. Since 2.5.0 doesn't have this flag at all, the functions were invisible to the test binary. Claude removed the `XML_TESTING` guards entirely, making the functions always non-static.

The second build failed with the same linker errors. The functions were *still* not being compiled because they sat inside `#if XML_GE == 1` blocks — another macro that doesn't exist in 2.5.0. Claude replaced all 8 occurrences with `#ifdef XML_DTD`, which is the equivalent feature gate in the older codebase.

The third build succeeded. All tests passed.

## The Container Problem

The session ran inside a toolbox container, not bare metal. The playbook's mock command failed immediately:

```
ERROR: Namespace unshare failed.
```

Mock needs namespace isolation, which doesn't work inside an unprivileged container. Claude figured out the fix: `podman run --privileged` with `mock --isolation=simple`. This wasn't in the playbook.

The reproducer testing had its own container surprise. The `centos:stream9` base image already shipped `expat-2.5.0-6.el9` — the same NVR as our build — because the c9s branch had already received this CVE fix. Both "unpatched" and "patched" tests showed identical results. Claude recognized the problem and downgraded to `2.5.0-5` for a valid baseline comparison.

## The Result

| Metric | Unpatched (2.5.0-5) | Patched (2.5.0-6) |
|---|---|---|
| Max Memory | 787 MB | 79 MB |
| Wall Clock | 2.08s | 0.22s |
| Error | "not well-formed" | "out of memory" |

The patched version detects the allocation amplification attack and rejects the document 10x earlier, using 10x less memory.

## Conclusion (by the human)

I'm truly astonished this worked so well. We've built a set of robust tools in our agents to operate the git repos, work with spec files, fix paths, open MRs, ... Here it was just one big prompt, no shiny tools, and it worked on the first try. It's mindblowing that one generation of models can improve so much.

To sum up what Claude did:
1. Found details about the CVE
2. Found upstream repo, and the upstream patch
3. Cloned the upstream repo in `/tmp/expat-work` and did the backport there
4. Checked out the 2.5 tag and used cherrypick
5. Resolved all conflicts ('duh)
6. Generated a downstream patch, included it in the spec file
7. Did an RPM build in a container and repeated until the build passed
8. Verified the resolution using the official reproducer

Thank you to the upstream maintainer for addressing the CVE in such a great detail.
