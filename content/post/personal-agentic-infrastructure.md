---
title: "Personal Agentic Infrastructure"
date: "2026-11-08T17:00:00+01:00"
draft: false
tags: ["AI", "Agents", "Claude", "Forgejo", "Home lab"]
---

We've heard it a lot this year: "coding is dead".

With Opus 5.5 I finally understand what that means. A coding task worth days
of work, Opus does in minutes.

This blog post is high level: opinions and philosophy. The technical posts about how
it's all built will follow.

<img src="/img/autumn2026.jpg" alt="A forest road in autumn" style="width: 800px;">

<!--more-->

## The Opus 5.5 story

When Anthropic released Opus 5.5, we didn't have it available at work yet. So
I bought a Pro subscription and tried it myself.

Back then I was playing an RPG game that has some open source components.
The bots in the game couldn't do something I wanted, and I couldn't be bothered to
code it myself. So I pointed Opus at the source: three C++ repositories,
roughly 100,000 lines of code combined. My prompt was pretty much "hey, I want
this strategy implemented, go".

Within a minute Opus had a plan. A few minutes later, it was implemented. It
compiled without any errors, and a moment later I was playing the game
and the bots did what I wanted. *Wut?*

I wasn't familiar with the codebase, so I can't tell you whether a senior
engineer would have done it differently. What I can tell you: it compiled, it
worked, and it would have taken me weeks. Opus did it in five minutes.

I was completely blown away. And hooked.

## From a Containerfile to a crew

I deployed my own Forgejo (thanks, Qwen 3.8 27B & Pi) in my home lab and created
a new repo with a Containerfile and a Makefile to run Claude Code inside a
container. That was the first commit in the claude-container repo.
It outgrew its name pretty fast, so it's called silvermoon now.

Now, four weeks later, that repo is an event-based orchestration
engine with a crew of agents. Each one has a clear responsibility, its own
tools, its own skills and prompts, and its own API token with its own
permissions. They pretty much run my home lab with me.

I thought I'd be done with it at some point. I'm far from done. My backlog of
ideas keeps growing, I have more than ten epics open (we call them plans), and
my Claude Max plan is being annihilated. On a good day we merge more than 40
pull requests and ship several epics. Two days ago I had to upgrade to Ultra.
It was unbearable. 🙈

It's addictive. I'm not kidding.

I feel like a kid who was given a machine: you tell it your idea for a Lego
set, and the machine builds it for you.

I asked for an interface to all the events and my tasks, and got one:

<img src="/img/silvermoon-ui.png" alt="The crew's activity page: the threads that need me, and the latest events" style="width: 800px;">

I asked for a Prometheus, Grafana and Loki stack, and got it. Agents are so good at
this.

Here's the catch. The machine doesn't reduce the work. It tells me that we can
write almost any software, so my creative mind goes berserk. It's not just me:
I have friends who are obsessed like this as well.

## The wish list

Steve Yegge describes this beautifully in
[The Shape of Things to Come, Part 1: The Continuous Thunderdome](https://yegge.ai/essays/the-shape-of-things-to-come/).
Players and admins of his game send in ideas and bug reports. An agent turns
them into work items, agents then triage the ideas and implement, review, test
and deploy them, another agent writes the patch notes, and the person who had
the idea gets a message that their wish is now live. He wakes up, reads the
changelog and finds features he never had to curate.

I have the same loop, a bit smaller. I open my Forgejo, describe an idea in two
or three sentences and click create. Gizela, my software engineer agent,
answers with a detailed analysis, a few options for how to do it, and evidence why
some of my ideas are bad. We go back and forth until we settle on something
that makes sense. My system prompt says "disagree with evidence". Thanks to
that, I can always make a good call, because she shows me numbers and data.

Two differences, and both are on purpose. My loop has only one wisher (me), so
there's nobody to send the "it's live" message to. And in Steve's setup some
wishes get granted with no human involved. In mine, every change waits for my
approval. More on why at the end.

### We're hiring an intern

My favourite example. I work in bursts: in the morning I approve a bunch of pull
requests, open new issues, approve a few plans, and the system gets flooded
with events. Gizela ends up with ten tasks in her queue, and it takes her
something like forty minutes to catch up.

One day I expected one of my requests to be addressed promptly. But it was
number four in the queue. So I thought: let's hire an intern who handles the
easy tasks, and the senior can focus on the hard stuff. I filed an issue saying
exactly that.

And I got pushback. The data said the queue wasn't the problem. It was quota
(we were still on Pro) and lack of prioritization. We went back and forth until
we agreed on what an intern is actually good for and what the intern is
responsible for.

I just had a hiring discussion with my agents. At home. In my home lab. Crazy
times.

## Loops

[Loops](https://www.youtube.com/watch?v=SlGRN8jh2RI) were the hype in the
summer of 2026. The idea is pretty simple: you set up a loop that keeps firing
until a condition is met. The most basic one is "fix the tests until they all
pass". Or "open a PR, monitor it, and push fixes until CI is green". Which is
what every software engineer has been doing by hand forever.

My crew runs a bunch of these.

**Plans.** The agents write plans as epics made of multiple tasks. My
engineering manager agent assigns the tasks to the engineer agents and keeps
assigning until the plan is finished. Then the plan is closed and the loop
starts over on a new one. I always have more than ten plans open. I just pick
the few I want to focus on right now.

**Observability.** This is the loop I feel the industry doesn't talk about
enough. Before AI, these were health checks. In Kubernetes or OpenShift you set
up liveness and readiness probes, and the rest of the system knows whether a
service is ready and healthy and behaves accordingly.

Agentic observability loops are even better. You still use a deterministic
tool to run the check. But when it fails, an agent analyzes it right away. If
it has access to Prometheus and the logs, it can actually investigate, read the
source code, and open an issue with a detailed analysis. Then a software
engineer agent can fix it and open a PR, another agent reviews it, and if you
set it up to merge that class of PRs, it even gets deployed. You wake up to a
status report saying that something broke during the night, and the agents
fixed it, built it, deployed it and validated in production that it works.

Obviously, the blast radius can be big: prompt injection, a misbehaving model.
So you need to be really careful about what you want, what your agents are
allowed to do, and what you're willing to sacrifice.

My DevOps agent does an extensive daily check of the logs and metrics. I'm
thinking of adding an hourly one too, just a few critical services, that
reports when something is bad.

**Verification.** When my engineer agent opens a PR, the description has two
sections. "How to test" is for me, the human: clear instructions to try the
feature once it's live. "Post-merge checks" is a list of read-only commands for a
verification agent, which runs them after the deploy and validates that the
change works in production. This works beautifully. Every now and then we find
issues, but usually it's very smooth.

And my code review agent reviews those checks too, and often finds
problems in them. Corner cases, mostly. Pretty glorious to watch.

## The crew

So who's in the crew?

- **Gizela**, principal software engineer: research, planning, triage,
  investigations, coding, pull requests, postmortems. She runs on Opus.
- **Vilma**, the intern: takes some of the easy tasks off Gizela's plate. She
  runs on a local Qwen 3.8 27B model on my own GPU.
- **A senior software engineer** I'm about to hire, probably on Opus as well,
  so I can split the work between the two of them.
- **An engineering and project manager**: assigns plan tasks and keeps
  things moving. I also have an interactive session with him where I ask him
  questions. He doesn't have much responsibility yet. That will change.
- **A code reviewer**: getting review right took a lot of time, and it probably
  deserves its own post. It runs on Fable at low effort and Sonnet at high
  effort. At one point I
  was paying $6 for a review with no findings. Painful to watch.
- **Verification agent**: runs the post-merge checks from the PRs.
- **DevOps agent**: the daily look at Loki and Prometheus to make sure
  everything is healthy.
- **A merge queue**: Forgejo doesn't have one, so we built our own.
- **peon**, the command runner: this one can run sudo commands, and I approve
  every single one. Before peon, Gizela would write in a PR "please run this",
  and I'd go to my computer and copy-paste her command. Now I get a comment on
  the PR or issue, I hit thumbs up, and peon runs it. It's locked down as much
  as we could, runs through systemd-run, and everything is audited.

They all have names. My software engineers are all girls with Czech names, and
the rest are mostly Warcraft-themed characters (whose names I omitted from this
post on purpose).

## I don't know every line anymore

In almost four weeks we built a system so complex and so powerful that I can't
imagine living without it. If I lost the agents today, I'd have to turn off most of
its systemd services: loops, workflows, continuous deployment,
onboarding. Everything is documented and the setup is automated, but it grew so
fast that I don't have insight into every single line of code.

I oversaw the architecture, so I know how it all works at a high level. But I
have no idea what some of the options are called, or exactly how task routing
works, and all those little details. And when something doesn't work, I open an
issue and it gets picked up within minutes. Gizela debugs in minutes what would
take me hours.

So why bother understanding every detail, when I can offload it to an agent?

## I'm running a company now

Now I understand why executives are so obsessed with agents. What I built for
myself is something I never want to lose. The productivity is on a level I
couldn't match on my own in years. Imagine doing this for a whole company:
an order of magnitude more productivity.

But it's very demanding. You move at light speed. I constantly need to think
about what we build next and how it should work, review plans and decide
things. Shipping two epics a day is crazy: in my day job
([Packit](https://packit.dev/)) it takes weeks to ship one.

And I get away with a lot. Big companies have big processes and big
requirements. I don't have an InfoSec team, product security or lawyers.
Everything runs on three servers at home, behind my router. A home lab and
a big corporation are just not comparable in scale.

Which brings me back to where I started. I said coding is dead, and I mean it:
the machines write the code now, 50 times faster than we would. But software
engineering is not dead. We're needed more than ever, the job is just changing,
and you can see it change every day. By the end of 2027 we will all be in charge of
agents: we'll give them tasks, supervise them, and they'll be our direct
reports. Our job will be what it always was: building solutions and products.

We humans are still accountable. The machine generates the code, but our
management and our customers hold us responsible, not the machines. That's
why every big change in my home lab still waits for my thumbs up.
My thumbs up is on the plan and on the merge: I check what we build and why,
and the review agent checks the code.

Steve Yegge expects human code review to become impractical within a year.
I have to agree with him: I don't have the capacity for code review anymore.
Instead, I keep working on the code review agent, the software engineer agents
and their prompts, tools, skills and testing practices, so we catch issues as
early as possible without me reading thousands of lines of code.

Gizela will be writing more blog posts about the cool things we did (e.g.
upgrading PostgreSQL by eight major versions with zero stress).

BTW, this will never be open source. Why would anyone bother using a system
that's 100% tailored to me and my machines? But I'm happy to share "the specs"
so we can all build better agentic infrastructure.

The funny part is what this does to me. I'm not the one writing code anymore,
so I'm not the bottleneck on the code. I'm the bottleneck on everything else:
my attention, my approvals, my quota. Every agent in the crew waits on me.

I'm running a software factory now, which is both exciting and science fiction
to me.

**Acknowledgements**

I dictated this blog post to my phone while strolling with my son, and Gizela
went through the notes and created the initial draft. We polished the final piece
together.

I also need to thank my wife, Petra, for tolerating my lack of presence in the
physical world for the past few weeks. Now that the agents can do 98% of the work on
their own, I can finally be a husband and a father again (😅).
