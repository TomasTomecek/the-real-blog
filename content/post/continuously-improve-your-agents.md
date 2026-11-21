---
title: "3 techniques to continuously improve your agents"
date: "2026-11-22T22:00:00+01:00"
draft: false
tags: ["AI", "Agents", "LLM"]
---

Agents work pretty much like we do. They are trained on our data, our
knowledge, our actions and decisions, so their workflows end up looking a lot
like ours. The difference is speed: crunching through megabytes of logs,
finding that one line in a repo, running a bunch of complex shell commands on
the fly. What takes me an hour by hand takes them seconds.

<img src="/img/foggy-autumn-trees-nov2026.jpg" style="width: 800px;">

<!--more-->

So how do they get better over time? We humans take a course, read a book,
learn from a mistake and (hopefully) remember it. Agents start every session
from scratch with their system prompt. Here are three techniques I use with my
[home agent crew]({{< ref "/post/personal-agentic-infrastructure.md" >}}) to
make them work better over time.

## 1. Write down what they learn, in git

When an agent figures something out on the fly, that's new information for the
agent. If you don't capture it, the next session needs to discover it again
and burns tokens on something it already knew how to do. Claude Code tries to
capture these as memories, but it's better to have a workflow for this for your
agents.

My agents are allowed to improve themselves: they open pull requests against
their own instructions and skills, and I review them like any other change. Why
git? Because you want this to be easily sharable, you want to see who changed
what and why, and you want to revert it when an "improvement" makes things
worse.

My principal software engineer agent, Gizela, saves small notes as she works,
and they live in the Claude Code runtime directory: standard behavior. The
problem is the directory is not in git. She had about 150 of them while we
drafted this blog post. We've just finished pulling them into our prompts and
skills (from 158 notes down to 28), and our engineering manager agent now asks
for the next pass when Gizela's memory grows again. This was our second round.

Funny thing is that your agent can literally do it with its own memories. This
reminds me of the scene from Harry Potter where Dumbledore pulls his memories
out with his wand into the Pensieve. The first time I asked Gizela to extract
her memories, she went through the files, the working rules went into the
skills, and the facts about my machines went into a shared `MEMORY.md` in my
infra repo, which every agent reads. The notes became regular pull requests,
reviewed like everything else.

### Skills vs. tools

Tools are code: the agent calls them and things get done. Skills are
instructions: they carry the reasoning, the "how we do things here". It's a
balance. A lot of what a skill describes could be a tool, but if a step needs
reasoning, it needs to be a skill.

All my agents work on a self-hosted Forgejo, and we have a pretty polished
process by now: how we plan, triage, implement, verify, deploy to production,
run privileged commands, break plans down into concrete tasks and size them.
All of it is written down in system prompts or skills, and guarded by code.

It started as one skill called `forgejo`. It grew. Massively. At some point it
felt too long, so I asked Gizela to investigate. Her answer: the skill was 48
KB, and more than half of it was her own inbox process, which nobody else
needed. Every other agent loaded all of it anyway, and it made them question
whether those parts applied to them.

So we split it.
Shared conventions and the command reference stayed in `forgejo`,
and the agent-specific parts moved into their own skills.
The split created five new skills in one day,
and two weeks later we're at 14.

Did it help?
We measured it a week later.
Fewer mistakes: PR bodies without a "Next steps" section went from 11 out of 35 to 3 out of 250.
Cheaper: no.
Gizela's cost per run went up from $0.90 to $1.01,
most likely because she delegated less work to cheaper subagents in that week.
So the honest answer is "partly".

## 2. Pick the right model, and measure it

If Fable wasn't so expensive and slow, we'd be using it for everything. But it
is, so match the model to the task:

- **The best model** for the hard, risky work: architecture, large or risky code reviews.
- **Medium models** for the everyday work.
- **Small models** for easy tasks: classifying a PR, routing, a quick yes or no.
  I wrote about one such case in
  [the 4B routing post]({{< ref "/post/system-1-models-for-code-review-routing.md" >}}).

Picking the right model is the harder part.
The proper way is an eval data set: up to date, predictable,
so you can run it against any model and compare.
That's pretty hard to build and keep fresh.

What I do instead: experiment in production. I do a little bit of preparation
work, then change the model or its settings, live with it for a day or a week,
and compare against the data from before. It's not a fair comparison (the work
is never the same two weeks in a row), but it's the easiest way for us to
experiment.
And the data is easy to get, it's all in the sessions:

- How many tool calls? More of them?
- How many failed?
- Are we burning more tokens?
- Does a run cost more, or take longer?
- Do we see regressions in behavior?

We now do this weekly: go through the sessions and make sure we're improving,
and especially that we're not repeating mistakes we already fixed.

Two of these experiments got their own posts.
In the first one, a
[4B model decides which pull requests need the expensive reviewer]({{< ref "/post/system-1-models-for-code-review-routing.md" >}}).
In the second, we
[replayed old code reviews to compare Claude models and effort levels]({{< ref "/post/replaying-code-reviews-to-compare-models.md" >}}).

And there's one running right now: Sonnet at max effort as an implementation
subagent. The main agent plans the change, hands the coding to Sonnet with a
precise spec and reviews the diff before it pushes anything. Is it as good? Is
it cheaper? We'll see in a few days. But since we're running out of our weekly
quota already, it looks more expensive.

## 3. Hold a retrospective every day

Every evening at 21:30 we do a retrospective.
First, our engineering manager agent writes a daily summary:
what we achieved, which PRs were merged, how the plans progress
and which plans are stuck.
Then each agent writes about its day: what worked, what didn't,
what's missing, and what they want fixed.

The engineering manager goes through those comments and writes a summary,
and then the software engineer agent triages it:
every point worth fixing becomes an issue with a proposal for me.
So every day we're improving a little bit.

It's really fascinating to watch agents dig through their own sessions
and tell you what to fix.
My favourite: our intern didn't get a single task one day,
because we were doing only complex work, nothing easy.
Her retro said:

> Any work at all: no mentions of me, no intern-labelled issues, no plan tasks
> and no onboarding issues reached me

She felt left out.

So we fixed it: our engineering manager now hands her the small tasks of every
plan, at most one every two hours.

## Closing thought

Next time, ask your agent if they have all the tools and skills to do their
job. Or ask them to go through their sessions and memories and create skills
out of them. You'll be surprised.
