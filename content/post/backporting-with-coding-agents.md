---
title: "Backporting upstream patches with Code Assistants"
date: 2025-08-01T06:00:00+02:00
draft: false
tags: ["AI", "LLM", "RPM"]
---
This is a follow-up to my previous post about [Claude Code]({{< ref "/post/claude-code-july-2025.md" >}}).

We are building a tool that can backport upstream git-commits into CentOS Stream autonomously using AI coding assistants.

<img src="/img/kaprun.jpg" style="width: 640px;">

<!--more-->

I've spent the last week working on this problem and before I check out for the week (it's Friday), I wanted to capture my thoughts.

## What is backporting?

The problem is clear: enterprise Linux distros ship older versions of upstream
software (for the sake of stability). It often happens that the latest HEAD of
an upstream project diverges so much that fitting a fix requires non-trivial
changes. Imagine scenarios like "the file was renamed, split, moved" or
"function does not exist or has a different signature".

Can we automate this fitting with AI coding assistants?

Here's an example of [BeeAI](https://github.com/i-am-bee/beeai) in action:
```
      {
        "id": "foo-bar",
        "iteration": 19,
        "tool": "think",
        "input": {
          "thoughts": "I have the reject file for `process.h`. Now I need to see the original `process.h` to understand the context of the change. After that, I
 will be able to manually apply the patch.\n\nLet's see the content of `filter/foomatic-rip/process.h`.",
          "next_step": [
            "I have examined the reject file for `process.h`. It seems like a simple addition of a variable and a function declaration. I will now examine the o
riginal `process.h` file to see its content and then I will manually add the lines from the patch. After that, I will do the same for `options.c` and the other
files with rejects. Once I have manually patched all the files, I will create a new patch file."
          ]
        },
        "output": "OK"
      },
```

## A week of experiments

* **Model is a key**. I compared Gemini 2.5 Flash and Pro. Flash was blazingly fast but produced atrocious code (not even valid C code 😅). So far we are getting the best results with Claude Sonnet 4.

* **Always verify**. The assistant says it successfully completed the job but when you verify the results you realize that's not the case. Meaning, you wouldn't even pay someone for that work.

* **They don't always follow instructions**. Sometimes they would swap given instructions for their own which usually results in a bad outcome: they get stuck and bail at some point.

* **Assistants can succeed**. You can run the same task several times and get different results. This is just so tiring—the fact that these systems are not predictable. Here is an example of BeeAI doing a backport successfully:
  ```
        {
          "id": "foo-bar",
          "iteration": 3,
          "tool": "ShellCommand",
          "input": {
            "command": "cd /git-repos/cups-filters && centpkg prep"
          },
          "output": "exit_code=0 stdout=\"Not downloading already downloaded cups-filters-2.0.0.tar.gz\\n...Applied patch filter/foomatic-rip/util.c cleanly.\\nApplied patch filter/foomatic-rip/util.h cleanly.\\nwarning: 2 lines add whitespace errors.\\n+ GIT_COMMITTER_DATE=@1753228800\\n+ GIT_AUTHOR_DATE=@1753228800\\n+ /usr/bin/git commit -q -m foobar.patch --author \\'rpm-build <rpm-build>\\'\\n+ RPM_EC=0\\n++ job
  s -p\\n+ exit 0\\n'"
        },
        {
          "id": "foo-bar-baz",
          "iteration": 4,
          "tool": "think",
          "input": {
            "thoughts": "The user wants me to continue validating the backported patch.\n`centpkg prep` was successful.\nThe next step is to generate an SRPM.\nI will run `centpkg srpm` in the `/git-repos/cups-filters` directory.\nThis will create a source RPM, which is a good indicator that the package is ready for a full build.\nI will check the output for any errors.\nIf the SRPM is generated successfully, I will proceed to the next step, which is to increment the 'Release' field in the spec file.\nI will now run the `centpkg srpm` command.",
            "next_step": [
              "The `centpkg prep` command completed successfully. I will now generate an SRPM using the `centpkg srpm` command to ensure complete build readiness."
            ]
          },
          "output": "OK"
        },      
  ```
  As you can see, there are still whitespace warnings in the patch application.

* **Larger fixes seem out of question**. Fixes that change hundreds of lines seem too complex for the current generation of models. The assistants just get overwhelmed or sometimes even straight-up refuse to do the work stating it's too complex.

* **Write as much code-automation as you can**. Cloning a repo via prompt? That's a bad idea, clone it yourself before running the assistant and tell it the location. You are saving resources (tokens generated) and adding reliability to the system.