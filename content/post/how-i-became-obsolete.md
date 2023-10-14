---
title: "How I became obsolete"
date: 2023-10-14T06:00:00+02:00
draft: false
tags: ["Packit", "project", "growth", "team"]
---

It's Saturday morning, 6:00 and I can't sleep. My mind has decided to start
functioning. I am tuning in some old [Bonobo](https://bonobomusic.com/) albums.
This is a good time to write about how I got to the point that
[Packit](https://packit.dev/) team no longer needed me.

![midjourney: a chilly Autumn morning in the central europe countryside with a
view of
sunrise](/img/a_chilly_Autumn_morning_in_the_central_europe_countryside.png)

<!--more-->

## Packit project: the beginning

We'll start with the birth of Packit.

```
$ git log --reverse
commit 4df26a6cc2afe31031f3f1adbf5b232a897adf96
Author: Tomas Tomecek <ttomecek@redhat.com>
Date:   Tue Nov 6 11:24:40 2018 +0100

    Initial commit

commit 180c970d3c6ac63ba5e3bf5c0a8ec9d063d86d70
Author: Tomas Tomecek <ttomecek@redhat.com>
Date:   Wed Nov 7 14:44:48 2018 +0100

    initial structure
    
    Signed-off-by: Tomas Tomecek <ttomecek@redhat.com>

commit 7dae624120ff633a4c74348616c40a1c2db30baa
Author: lachmanfrantisek <flachman@redhat.com>
Date:   Thu Nov 8 10:53:32 2018 +0100

    Implement srpm generating
    
    Signed-off-by: lachmanfrantisek <flachman@redhat.com>
```

I almost shed a tear when I saw this. It's been almost 5 years since we started
working on Packit with Franta (fun fact: initially the project was called
source-git).

The beginning was rough: we knew what our long term goal was - automate RPM
packaging process and enable folks easier integration process to Red Hat OS's.
But how to get there?


## The struggle

Project kickoffs can be really frustrating. Now I can see a ton of things I'd change.

Here's a list of things that didn't go so well:

- **Expectations**: we defined goals with our managers but unfortunately they
  proved to be overly ambitious. The project bootstrap took much more time than
  we expected.

- **Leadership**: my role was tech lead from the start, I loved that! With
  [Frantisek](https://github.com/lachmanfrantisek), we've had endless technical
  discussions about features, project structure, integration with Fedora
  Project and much more. In retrospect, I can see now that we needed a product
  owner as well to define the actual "product".

- **Single-point-of-failure**: once we had a production deployment, I was in
  charge of all the *OpenShift stuff* initially. The problem was that it took
  me a lot of effort to set up processes and documentation how we should handle
  production environment as a team. I still remember the frustration from
  constant interrupts to check what went wrong in the live service. Spoiler
  alert: [Jirka](https://github.com/jpopelka) did a stellar job with
  documenting our DevOps workflow and we also started a ["Rotating roles"
  process](https://medium.com/@laura.barcziova/how-to-run-an-open-source-service-fb3303240e69)
  soon.

- **PoC or MVP?** Some of the early adopters were not happy. Packit worked well
  for Packit. Once the RPM packaging process was different, it broke. This
  situation was particularly frustrating as it led some early adopters to leave
  the project and develop their own solutions instead. The message for us was
  clear: we failed them.

It's been 4 years, sadly I don't have all the details any more. It's possible
some are incorrect.


## Everyone grew

I don't intend to write a book here. We've had several changes on the team over
the years.

Nevertheless, we've managed to build a stable core Packit team. Four people saw
the birth and carry immense knowledge of the project. I am grateful to be one
of them together with Frantisek, Laura and Jiri. Though our present involvement
varies and the past knowledge slowly drips away.

It was an honour to watch folks take on more responsibilities, be more active in
chat and github, give talks, influence direction, research and develop features
end-to-end, therefore slowly chipping away from my role as a product owner.

It got to a point that Franta took over most of my responsibilities in 2022. My
only role was to be the main contact.

I was proud that we got so far with the project: we had hundreds of users,
tenths active daily.

At the same time, I was depressed:

- Well, what was my role on the project then?

- Should I respond in chat and github? Create new issues? Pay attention to
  roadmap and long-term vision?

- I tried to focus on the endgame: are we happy with our production cluster?
  can we integrate Packit somewhere else?

- No matter what I did, deep down I knew something needs to change.


## 2023

I pursued opportunities outside of the team: trying something new.

It got me to [Jan
Zeleny](https://www.linkedin.com/in/jan-zeleny-1a747928/?originalSubdomain=cz)
who offered to mentor me.

His observation was spectacular:

> Tomas, you are obsolete. They don't need you anymore. Your work is done.
> You've made yourself obsolete and that's a job well done.

He was right. I ignored the obvious truth all these months and chose to be
depressed. At that point, I knew I had to quit the day-to-day team activities.

Especially retrospective, it would just be too emotionally painful for me to
know, I am no longer involved in the daily operations.


## Today

I'm still involved, they can't get rid of me 😇, in a consultant-like role. But
I'm also working on various new things.

With Irina, we are teaching another round of ["Mastering
Git"](https://gitlab.com/redhat/research/mastering-git) at FI MUNI.

Generative AI fascinates me. (Thank you, ChatGPT for helping me write
this!)

This blog post provides my personal point of view. It does not reflect the
views of my employer, Red Hat. I wrote it just to get "this" out of my head.

Did I miss anything significant? Is there a mistake? Please reach out and I'd
be happy to correct it.

![Thanks ChatGPT!](/img/obsolete-blog-chatgpt.png)
