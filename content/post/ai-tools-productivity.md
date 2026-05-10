---
title: "AI tools feel like heroin for productivity"
date: "2026-05-10T08:00:00+02:00"
draft: false
tags: ["AI", "Tools"]
---

This is my personal opinion and I'm going straight to the point, no intro.

AI assistants such as Claude Code, Cursor, OpenCode, OpenClaw, and others are
so addictive for anyone who loves building things.

Software engineers are not going anywhere. Instead, we're getting excavators
and ditching our shovels.

I authored 192 commits this year (as of May 2026) without writing a single
feature solely myself. I still edit files, but mostly out of convenience. If I
need just one or two lines changed, it's faster doing it myself than asking
Claude.

I guess this was an intro 🤦

<img src="/img/sunset-apr2026.jpg" style="width: 800px;">

<!--more-->

For a long time I wanted to start using LLMs to read my emails, give me
summaries, and tell if something important is waiting for me. I'm sure Google
will add something like this into Gmail sooner or later, but getting it right
for everyone is a much harder problem than me doing it for myself.

I had pretty strict criteria because it's my emails and I ain't sharing that
with AI providers (despite already storing them at Google's servers). The
requirements:

1. LLM inference happens locally on my GPU.
2. Minimal amount of dependencies ([litellm hack](https://futuresearch.ai/blog/litellm-hack-were-you-one-of-the-47000/) still resonates with me).
3. Python.
4. Commandline tool I run in a podman container easily.
5. Notify me on Telegram.

This was my initial commit:
```
commit 270956e06068627aa28ba8d4ec83174819891401
Author: Tomas Tomecek <ttomecek@redhat.com>
Date:   Sun Apr 26 13:38:04 2026 +0200

    init

diff --git a/Containerfile b/Containerfile
new file mode 100644
index 0000000..6b223a0
--- /dev/null
+++ b/Containerfile
@@ -0,0 +1 @@
+FROM fedora:43
diff --git a/README.md b/README.md
new file mode 100644
index 0000000..8c3f95b
--- /dev/null
+++ b/README.md
@@ -0,0 +1,15 @@
+# Anything important?
+
+Is there an email that requires my attention?
+
+This is a simple tool that periodically checks your gmail inbox for important emails and lets you know via Telegram.
+
+Your inbox is sacred, this is why:
+1. This tool uses the least amount of dependencies in case one gets compromised
+2. It's meant to be run in a container
+3. By default, the tool can access only the Gmail MCP server, nothing else
+4. Uses your locally deployed LLM
+
+## How
+
+`anything-important` accesses the official Gmail MCP server.
diff --git a/pyproject.toml b/pyproject.toml
new file mode 100644
index 0000000..4640904
--- /dev/null
+++ b/pyproject.toml
@@ -0,0 +1 @@
+# TODO

```

(The Gmail MCP server ended up not being needed. It's a straightforward Python
tool that queries the Gmail API directly and processes the content with LLMs)

After I committed this, I opened Claude Code and asked it to finish that
project. Something that would normally take me hours. Claude had the first
commit done in 27 minutes (based on git-log, it was definitely much faster). As
I was babysitting my son and Claude worked hard on this, I just occasionally
answered Claude's prompts. An hour and a half later, the first version of the
tool was done. All I did was write those 17 lines and answer probably 7
prompts.

This is bonkers. How can you *not* get addicted? I write an idea down, hand it
to Claude, and get a working PoC back in hours.

I absolutely understand how people who don't know anything about software
engineering are now building mobile apps and websites. We all have ideas for
new tools and improvements, but until now you had to be an engineer or have
money to realize them. Not anymore.

With a decent GPU I can run everything locally and don't even need to send my
data to any AI company. I can't imagine where we'd get by the end of 2026.

This isn't just about saving time. If AI is doing the work for me, I get to
save my mental energy too and can spend it with my family instead.

Well, that's what I thought. Instead I want to compound on that productivity
and do much more. Especially when Claude's doing the actual work. I just review
the results and decide on the next steps.

I worry for myself and others that maybe AI assistants will be a faster way to a burnout.

My recent pattern is to run multiple Claude sessions during my work hours.
During meetings, I check in on my primary session and make sure Claude's making
solid progress so that at the end of the meeting I have significant progress on
the task. As I write this, I realize how bizarre it sounds.

## Conclusion

This blog post is just a braindump of what I've been thinking about for the
past few weeks. While many articles were focused on how AI is replacing jobs,
or how it sucks doing X or Y, to me it's an addictive work tool that I cannot
function without right now. No more googling, reading documentation, scouting
StackOverflow, analysing sources, asking experts for help; I now have a
hardworking assistant available 24/7.

[`anything-important`](https://github.com/TomasTomecek/anything-important) is
my most committed project for this year. Claude authored 98% of the changes,
probably. I did a bunch of one-liners. I have continuous ideas for improvement
because the tool truly helps tame my personal email. And it's so easy to
prototype: a kid in my left arm, minimal prompt written by my right hand, and 15
minutes later I can already give that idea a shot.
