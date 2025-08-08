---
title: "More reliable agents"
date: "2025-08-08T08:00:00+02:00"
draft: false
tags: ["AI", "Agents"]
---

Over the last two weeks, we've spent time guiding our agents to perform more advanced workflows.

It was rough. For several days I was truly frustrated, because the results were atrocious.

<img src="/img/kopanice.png" style="width: 800px;">

<!--more-->

My colleagues, [Laura](https://github.com/lbarcziova) and [Nikola](https://github.com/nforro), and I have come up with several solutions that significantly improved the quality of our agents. We achieved this by trying different approaches and sharing our results together.

## Using the right model

The first one is very obvious. Make sure that the model you are using is the right one for your job. You should experiment with others if possible.

We are using Gemini 2.5 pro, it's slow but performs very well. We've compared it to the flash variant which is blazingly fast, but also performs pretty poorly. I.e. code generation is unusable as it can generate invalid code.

We also like Sonnet 4 and are considering using it for coding tasks because it performs really well there.

## System and user prompts

Calls to the OpenAI API compatible server contain two main prompt sections:
1. System prompt - how the model should behave
2. User prompt - the task it should solve

```
   "messages": [
      {
        "role": "system",
        "content": "# Role\nAssume the role of Red Hat Enterprise Linux developer.\n\n# Instructions\nUse the `think` tool to reason through complex decisions a
nd document your approach.\n -Preserve existing formatting and style conventions in RPM spec files and patch headers.\n -Use `rpmlint *.spec` to check for packaging issues..."
      },
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "Your task: Work inside the repository cloned at /git-repos/repo/..."
          }
        ]
      }
```

Both prompts are related, but they serve a different purpose.

We've realized that if we add too many instructions in the user prompt, the model starts ignoring some. So the best strategy for us is to make the user prompt as light as possible.

## Tools and commands

It's magnificent that agents can come up with shell commands and run them.
Also, it's pretty damn scary. One bad `rm` and you may lose data while you are not the one who ordered that command, a stochastic system did.
Agents try to come up with different solutions when they fail, this is pretty powerful as they can solve tasks with different approaches, something we humans do as well.
On the other hand, agents may be trying to solve a problem that's out of their reach: e.g. do an authenticated operation without proper credentials.

We've realized that when we develop our own [tools](https://www.ibm.com/think/topics/tool-calling) and give models access to them, this increases predictability a lot. Suddenly they don't need to be creative, they just need to use the tool properly and follow our instructions precisely.

This has reduced the number of iterations for the agent quite a bit and we are getting consistent results.

## Write clear, specific instructions

Think of the agents as interns that just finished Uni. They are smart, passionate, and eager to work.

If you provide precise instructions, the agent doesn't need to be creative when something goes wrong. Similar to an intern, if you give them wrong instructions, they may be stuck for days.

Make sure the instructions you provide are 100% accurate and can reliably lead to a successful solution.

And when an agent says it completed a task successfully, always verify it!

## Being very direct

Don't be afraid to stress certain parts of your prompt.

I was asking the agent to do a complex git operation and it wouldn't follow my lead. I realized I needed to be very direct, so this is what I added to the prompt:

> "DO **NOT** RUN COMMAND `git am --continue`"

And suddenly the agent would acknowledge I don't want it to continue the `am` process, instead I wrote a tool that predictably finishes it.

## Less is more

We've realized that concise, direct, and accurate user prompts work the best. It's okay to have a big system prompt, but the user prompt should be only a few lines big at most.

Consider splitting the task into a separate agent or automate parts with a tool.