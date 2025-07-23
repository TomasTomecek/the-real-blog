---
title: "Trying Claude Code in July 2025"
date: "2025-07-22T08:00:00+02:00"
draft: false
tags: ["AI", "Agents"]
---

<img src="/img/forrest.jpg" style="width: 640px;">

I am writing this blog post as Claude Code is working on
[upsint](https://github.com/packit/upsint.git), a tool we worked on many years
back. I haven't touched upsint's codebase for some time. It worked just fine
all those years but recently I started getting 401 and 403 while creating pull
requests, probably due to my API token expiring. I have never implemented any
serious error handling in the tool so it was hard to diagnose the issue
quickly:

```
requests.exceptions.RetryError: HTTPSConnectionPool(host='api.github.com',
port=443): Max retries exceeded with url: /repos/packit/ai-workflows/pulls
(Caused by ResponseError('too many 403 error responses'))
```

<!--more-->

Claude noticed this as well, when I asked it to figure out that error message:
```
  Root Cause Analysis

  The 403 error indicates GitHub API rate limiting or authentication issues. Key findings:

  1. No retry mechanism - The code at upsint/services/github_service.py:131 calls self.repo.create_pull(**opts) with no error handling
  2. Hard-coded 4-second delay - Line 130 has time.sleep(4.0) but it's before the API call, not for retries
  3. Minimal error handling - Only catches UnknownObjectException, not rate limit or connection errors
  4. PyGithub default retry - Relies on PyGithub's default retry behavior which may be insufficient
```

I am blown away how powerful these agents are now. It would have taken me an
hour to analyze the issue in detail and come up with a plan. AI agent can do
that in less than a minute.

Okay Claude, go for it, address those problems.

👷 *Claude at work.*

After it did its thing, I explored. It's quite clear to me that this is a very
different style of work: not writing the code myself but reviewing someone
else's output (AI agent) while committing it as my own. Just weird.


# How did Claude Code do?

Pretty well, honestly. It saved me hours easily. Although , it did several
rookie mistakes:

* Added new imports and haven't used it.

* Added a new parameter to a function and haven't used it.

* Added duplicate lines, could have been written more efficiently. This is my fixup:
```diff
@@ -139,26 +140,9 @@ def create_pr(ctx, target_remote, target_branch):
         logger.info("PR link: %s", pr.url)
         print(pr.url)

-    except RateLimitExceeded as e:
-        click.echo(click.style("Error: GitHub API rate limit exceeded", fg="red"), err=True)
-        click.echo(str(e), err=True)
-        if ctx.obj.get('debug'):
-            import traceback
-            traceback.print_exc()
-        sys.exit(1)
-
-    except GitHubAPIError as e:
-        click.echo(click.style("Error: GitHub API error", fg="red"), err=True)
-        click.echo(str(e), err=True)
-        if ctx.obj.get('debug'):
-            import traceback
-            traceback.print_exc()
-        sys.exit(1)
-
     except Exception as e:
         click.echo(click.style(f"Error: {str(e)}", fg="red"), err=True)
         if ctx.obj.get('debug'):
-            import traceback
             traceback.print_exc()
         sys.exit(1)
```

* Misunderstood one `time.sleep`, you can see it listed above. I added that line back with a description:
```diff
+        # wait before creating, good time to ^C now if needed
+        time.sleep(4.0)
```

* No tests added, despite the project having a test suite.


# Things took a different turn...

I decided to run the code. With the newly added `--debug` option, it was easier
for me to diagnose the issue, though the problem persisted.

TL;DR I actually had to use a different token. [Fine-grained vs. classic tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens).

Here comes the twist.

Most of the code Claude implemented landed in a deadcode module (my bad, forgot
to drop that part long time ago). So, Claude was happy with its results, but
the code it implemented would have never been used. And the actual flow was
unchanged. I laughed.

I asked it to add tests as well. Oh my, they were terrible, half of them were
failing, I deleted most of them. The worst part is that Claude convinced me
they are solid.

I was running this experiment in a fresh `fedora:42` container, so it had none
of my credentials. Claude had issues running the test suite in the environment,
so it developed a script that would run the tests. The script ignored test
failures and ended with return code 0.

When I run the tests directly with pytest, I saw the failures easily. Claude
told me all tests passed.

At this point, I was very frustrated.


# Conclusion

Claude Code is a powerful tool and can save you hours when used properly.

My prompts were simple, and the environment tricky, so I'm sure this is why I
got such disastrous results.

My biggest frustration was that the tool convinced me it did good, but when I
verified its work, I would have asked it to start from scratch.

After all, it's still a tool that needs to be used properly. I'm not giving up.
