---
title: "Announcing Log Detective"
date: 2024-01-08T06:00:00+02:00
draft: false
tags: ["AI", "LLM", "RPM"]
---

I'm excited to share that we've reached the first milestone of our new project, [Log Detective](https://log-detective.com/).

<img src="/img/a_detective_inspecting_a_burning_log_in_a_shady_neighb.png" alt="midjourney: a detective inspecting a burning log in a shady neighbourhood at night" style="width: 640px;">

<!--more-->


# What's Log Detective

A tool that will help you understand build logs. Our initial focus is on RPM
build logs and container image build logs. We intend to provide a detailed
description of why a build failed that is easy to understand for humans.

Some build logs can be very cryptic. Especially for software that uses an
ecosystem you're not familiar with. Imagine you're a frontend developer and
you're asked to resolve a build failure in a Linux kernel module: that would be
quite a challenge.


## Hands-on example

Here we go!

```
[75/91] gcc -Isrc/client/bluechictl.p -Isrc/client -I../src/client -Isrc -I../src -fdiagnostics-color=always -D_FILE_OFFSET_BITS=64 -Wall -Winvalid-pch -Wextra -Werror -std=gnu17 -include config.h -O2 -flto=auto -ffat-lto-objects -fexceptions -g -grecord-gcc-switches -pipe -Wall -Werror=format-security -Werror=implicit-function-declaration -Werror=implicit-int -Wp,-U_FORTIFY_SOURCE,-D_FORTIFY_SOURCE=3 -Wp,-D_GLIBCXX_ASSERTIONS -specs=/usr/lib/rpm/redhat/redhat-hardened-cc1 -fstack-protector-strong -specs=/usr/lib/rpm/redhat/redhat-annobin-cc1 -m64 -mcpu=power8 -mtune=power8 -fasynchronous-unwind-tables -fstack-clash-protection -Wno-cast-function-type -MD -MQ src/client/bluechictl.p/method-metrics.c.o -MF src/client/bluechictl.p/method-metrics.c.o.d -o src/client/bluechictl.p/method-metrics.c.o -c ../src/client/method-metrics.c
FAILED: src/client/bluechictl.p/method-metrics.c.o 
gcc -Isrc/client/bluechictl.p -Isrc/client -I../src/client -Isrc -I../src -fdiagnostics-color=always -D_FILE_OFFSET_BITS=64 -Wall -Winvalid-pch -Wextra -Werror -std=gnu17 -include config.h -O2 -flto=auto -ffat-lto-objects -fexceptions -g -grecord-gcc-switches -pipe -Wall -Werror=format-security -Werror=implicit-function-declaration -Werror=implicit-int -Wp,-U_FORTIFY_SOURCE,-D_FORTIFY_SOURCE=3 -Wp,-D_GLIBCXX_ASSERTIONS -specs=/usr/lib/rpm/redhat/redhat-hardened-cc1 -fstack-protector-strong -specs=/usr/lib/rpm/redhat/redhat-annobin-cc1 -m64 -mcpu=power8 -mtune=power8 -fasynchronous-unwind-tables -fstack-clash-protection -Wno-cast-function-type -MD -MQ src/client/bluechictl.p/method-metrics.c.o -MF src/client/bluechictl.p/method-metrics.c.o.d -o src/client/bluechictl.p/method-metrics.c.o -c ../src/client/method-metrics.c
../src/client/method-metrics.c: In function â€˜method_metrics_listenâ€™:
../src/client/method-metrics.c:124:13: error: too few arguments to function â€˜event_loop_add_shutdown_signalsâ€™
  124 |         r = event_loop_add_shutdown_signals(event);
      |             ^~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
In file included from ../src/client/method-metrics.c:7:
../src/libbluechi/service/shutdown.h:15:5: note: declared here
   15 | int event_loop_add_shutdown_signals(sd_event *event, ShutdownHook *hook);
      |     ^~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
```

Here's a snippet from a build failure of [Eclipse
Bluechi](https://github.com/eclipse-bluechi/bluechi) that I randomly picked in
[Packit's dashboard](https://dashboard.packit.dev/pipelines/).

If you're familiar with C, I can see how this is easy to resolve.

But for new contributors, and especially junior developers, it would be handy if
someone explained to them in detail what has happened there. Senior devs can do
that, though their time is valuable and a scarce resource. Could a Large
Language Model provide an explanation?

Let's try Google Bard.

I asked...

> You are a professional C developer. Explain this error to me:  
> -- the snippet from above --

And this is what I got:

> Sure, I can help you with that.
> 
> The error message you're seeing is indicating that the `event_loop_add_shutdown_signals()` function is being called with too few arguments. This function takes two arguments: the event loop and a pointer to a shutdown hook function. The error message is saying that you're only providing the event loop, but you also need to provide the shutdown hook function.
> 
> The `ShutdownHook` struct is defined in the `../src/libbluechi/service/shutdown.h` header file. The `event_loop_add_shutdown_signals()` function takes a pointer to a `ShutdownHook` struct as its second argument. This struct contains the function to call when the event loop is shutting down.
> 
> To fix this error, you need to provide the shutdown hook function to the `event_loop_add_shutdown_signals()` function. You can either create a `ShutdownHook` struct and pass it to the function, or you can pass the address of a function directly.
> 
> Here is an example of how to fix the error by creating a `ShutdownHook` struct:
> 
> ```c
> struct ShutdownHook {
>     void (*on_shutdown)(void);
> };
> 
> static ShutdownHook shutdown_hook = {
>     .on_shutdown = method_metrics_shutdown,
> };
> 
> int method_metrics_listen(sd_event *event) {
>     int r;
> 
>     r = event_loop_add_shutdown_signals(event, &shutdown_hook);
>     if (r < 0) {
>         return r;
>     }
> 
>     // ...
> }
> ```
> 
> This code creates a `ShutdownHook` struct and initializes it with a pointer to the `method_metrics_shutdown` function. Then, the `event_loop_add_shutdown_signals()` function is called with the event loop and the address of the `ShutdownHook` struct.
> 
> Here is an example of how to fix the error by passing the address of a function directly:
> 
> ```c
> int method_metrics_listen(sd_event *event) {
>     int r;
> 
>     r = event_loop_add_shutdown_signals(event, method_metrics_shutdown);
>     if (r < 0) {
>         return r;
>     }
> 
>     // ...
> }
> ```
> 
> This code passes the address of the `method_metrics_shutdown` function directly to the `event_loop_add_shutdown_signals()` function.
> 
> These two approaches will fix the error and allow you to call the `event_loop_add_shutdown_signals()` function correctly.

That's an exceptional and detailed response. It may not be 100% correct but if
a computer can give me this explanation, I would know immediately how to
continue, where to look and what to learn next.

## Why do we need Log Detective?

Existing public AI LLM apps such as Bard and ChatGPT can provide these
explanations quite well already for popular ecosystems such as C, Python, Go,
JavaScript ... This can help you quite well while you're working on a change on
your laptop before sending it out as a pull request.

But once we move to the world of Linux distributions, packages, and components,
these tools start to fall short. A perfect use case is a dependency problem when
a build fails because build dependencies cannot be installed. This is a common
problem that happens often while building RPMs.

Every Linux distro or ecosystem solves these problems differently.
Dependency problems usually require collaboration with other developers or
admins. Sadly, existing LLMs don't know this information (and plenty others more
complicated). They provide decent guidance for users. Although for a
distribution developer they are not applicable.

## Call for action

Log Detective is a project sponsored by Red Hat and we start in the Fedora Linux ecosystem.

If you have a build in Fedora Copr, Koji or a local container image build, we
welcome your contributions of solutions on how to solve build failures so we
can include them in our data set.

https://log-detective.com/

As of January 2024, we are in a research phase. We don't have any code or a
prototype to share.

