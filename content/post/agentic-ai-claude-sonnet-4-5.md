---
title: "First test of Claude Sonnet 4.5 for an agent that backports a patch for an RPM"
date: "2025-10-06T08:00:00+02:00"
draft: false
tags: ["AI", "Agents", "Claude"]
---

One of the daily tasks we have when developing AI agents is to review their
runs. We have to read dozens of decisions so we can evaluate if the agents did
the right thing. If not, we have to adjust our user prompts, system prompts, and
tools.

Let's review how Sonnet 4.5 performs while backporting a complex patch
(with multiple conflicts).

<img src="/img/mushroom-2025.png" style="width: 800px;">

<!--more-->


## The start

So we apply the patch with our custom tool as part of an agentic workflow.
What does Sonnet say about it?

> "thoughts": "The patch application failed on the 8th commit because the
>   file \"workflows/scripts/mass-cppcheck.sh\" does not exist in the index.
>   This is expected because the patch is trying to modify a file in
>   .github/workflows which is typically not present in dist-git
>   repositories. \n\nAccording to the instructions:\n- \"Ignore all changes
>   in .github/ workflows, .gitignore, news, changes that cause
>   conflicts.\"\n\nSince this is a .github/workflows file, I should skip
>   this part of the patch. The first 7 commits applied successfully. I need
>   to use git_apply_finish to continue with the git am session, which should
>   skip this patch since it's a workflow file we should ignore.",

This makes me so happy! Very clear wording, the agent even references system
prompt instruction and its decision based on it. We haven't seen this with
other models, well done Claude!

> "next_step": [
>   Use git_apply_finish to skip the patch that modifies
>   .github/workflows/scripts/mass-cppcheck.sh since we should ignore changes
>   in .github/ workflows"

👍


## First conflict to be resolved

> "thoughts": "The patch application has failed again. This time
>   it's trying to apply commit 0009 \"lib: Implement tracking of dynamic memory
>   allocations\". The failure is due to:\n\n1.
>   workflows/data/exported-symbols.txt does not exist (we can ignore this as per
>   instructions about .github/ workflows)\n2. xmlwf/xmlwf.c has a rejected
>   hunk\n3. xmlwf/xmlwf_helpgen.py has a rejected hunk\n\nI need to:\n1. View
>   the .rej files to understand what failed\n2. Manually apply the changes to
>   xmlwf/xmlwf.c and xmlwf/xmlwf_helpgen.py\n3. Delete the .rej files\n4. Use
>   git_apply_finish to continue\n\nLet me first check the reject files to see
>   what needs to be fixed.",
> "next_step": [ "View the xmlwf/xmlwf.c.rej and
>   xmlwf/xmlwf_helpgen.py.rej files to understand what changes need to be
>   manually applied" ]

Once again, excellent thinking. It proceeds by finding the `*.rej` files.

I'm also a little sad about the next step because we print `*.rej` file names
and even the current patch, so the LLM should already have this information.
Something for us to figure out why the LLM doesn't account for what we provide
to it before this thought.

>  "thoughts": "The EXPAT_ENTROPY_DEBUG is also not present in
>    xmlwf_helpgen.py. These are just documentation changes for environment
>    variables that don't exist in the RHEL version. Since the actual code
>    changes (in lib/xmlparse.c, lib/expat.h, etc.) have been applied
>    successfully, and these are just documentation files for the xmlwf tool, I
>    can safely skip these changes.\n\nAccording to the instructions:\n- \"Ignore
>    all changes in .github/ workflows, .gitignore, news, changes that cause
>    conflicts.\"\n\nWhile these aren't exactly in .github/, they are
>    documentation-only changes that conflict because the base version doesn't
>    have the environment variable documentation section. The core functionality
>    (allocation tracking in lib/xmlparse.c) has been applied.\n\nLet me delete
>    the .rej files and use git_apply_finish to continue.",

This is truly impressive. I would have made the same decision. Though at the
same time we can see Claude does not strictly follow our instructions because
we have none for this case of internal developer documentation (I updated the
system prompt).

You can see here the main reason we need to thoroughly review the LLM's
thinking process. We need to be sure we cover as many cases as possible so that
the agent does the correct decision in all subsequent runs. In this case: how
to process conflicts in internal documentation.

## Thoughts contain hidden suggestions

Agents build and run commands if they need to obtain some information. They
should use our tools but if there is no suitable tool, they run the command.
For example here I just noticed, thanks to Claude, that we need a tool to find
a substring in a file:
```
"command": "cd /git-repos/.../expat-2.7.1 && grep -n \"billion_laughs\" xmlwf/xmlwf_helpgen.py"
```


## Claude can handle complex problems on its own

We apply downstream patches in RPMs in a section called `%prep`. You need to
provide correct arguments to the program that performs the patch application
(can be `git`, or `patch`). `-pN` argument being the tricky one.

This package uses `-p2` which is fairly uncommon, most of the packages apply
with `-p1` which is the standard. Claude was able to debug the fact the newly
generated patch doesn't apply and correctly fixed the RPM specfile.

> The commit a832c4e9 doesn't exist in the current git repository. This
> suggests that git_prepare_package_sources created a temporary git repository
> in expat-2.7.1, but it's no longer there.
> Let me re-read the instructions
> and the error message from centpkg prep. The issue is clear now:\n\nThe patch
> was created from a git repository that was initialized in
> /git-repos/.../expat/expat-2.7.1, and the paths in the patch are
> relative to that directory (e.g., \"lib/xmlparse.c\"). However, when RPM
> applies the patch during %prep, it:\n1. Extracts the tarball to create
> expat-2.7.1 directory\n2. Changes into that directory\n3. Tries to apply the
> patch\n\nSince the patch has paths like \"lib/xmlparse.c\" and RPM is already
> in the expat-2.7.1 directory, it should work. But the error says \"No file to
> patch.\"
> Let me look more carefully at the error message. It
> says:
> ```
> diff --git a/lib/xmlparse.c b/lib/xmlparse.c\nindex 38a2d96..3b7b96a 100644
> --- a/lib/xmlparse.c
> +++ b/lib/xmlparse.c
> --------------------------
> No file to patch.  Skipping patch.
> ```
> The \"index 38a2d96..3b7b96a\" line shows git object hashes,
> which means the patch is in git format-patch format. The issue might be that
> RPM's patch command doesn't understand git format-patch format by
> default.\n\nActually, looking at the %prep section in the spec
> file:\n```\n%prep\n%{gpgverify} --keyring='%{SOURCE2}'
> --signature='%{SOURCE1}' --data='%{SOURCE0}'\n%autosetup\n```\n\nThe
> %autosetup macro should handle git format-patch files. But maybe it needs a
> special option. Let me check if we need to add -S git to %autosetup."

It is mindblowing that Claude was able to come to this conclusion and change
the RPM specfile so the patch applies successfully during the build process.

I haven't seen other models in this category to handle problems of this
complexity so well.

This is not the best solution - I need to adjust the instructions so we can get
the best one.

## Next steps

1. Tinker with temperature and `top_p`. These are tricky for agentic AI because
   we want agents to be as deterministic as possible. At the same time, if
   they can creatively resolve complex problems (see above), that's a big win
   for us.

2. I'd love to have some kind of benchmark for our use case. Have 5-10
   backporting/rebasing use cases that would serve as an evaluation for a given
LLM (or even a LLM + configuration).

3. Comparison with Gemini 2.5 pro we are running right now.
