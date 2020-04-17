---
title: "Debugging Python Code"
date: 2020-04-17T17:43:01+02:00
draft: false
tags: ["python", "linux", "code"]
---

People on my team asked me some time ago how I debug things in our python code
base. So I thought I'd share here.

The easiest (and least efficient) way to debug is to use `print` statements and
logging. But since you're not using a real debugger, you need to update the
code and rerun in order to get new results.

Hence the most efficient way to debug things in python is to use a debugger.
Don't be scared, they are easy to master and they'll serve you nicely for the
rest of your life. They all are very similar.

<!--more-->

## Debuggers, intro

I didn't know that python 3.7 supports [breakpointing](https://docs.python.org/3/library/functions.html#breakpoint) natively, thanks to
[Hunor](https://github.com/csomh) who gave me pointers.

In this blog post, I'll be using [packit](https://github.com/packit-service/packit), our rockstar project.


### How do I start?

I'd just put `breakpoint()` statement in the code where I want to prompt for the debugger.

And then just run the code:
```
$ packit srpm
Packit 0.9.1.dev2+gd4f6f93 is being used.
> /home/tt/g/user-cont/packit/packit/api.py(446)create_srpm()
-> self.up.run_action(actions=ActionName.post_upstream_clone)
(Pdb) 
```

But how?
```
(Pdb) h

Documented commands (type help <topic>):
========================================
EOF    c          d        h         list      q        rv       undisplay
a      cl         debug    help      ll        quit     s        unt      
alias  clear      disable  ignore    longlist  r        source   until    
args   commands   display  interact  n         restart  step     up       
b      condition  down     j         next      return   tbreak   w        
break  cont       enable   jump      p         retval   u        whatis   
bt     continue   exit     l         pp        run      unalias  where    

Miscellaneous help topics:
==========================
exec  pdb
```

See all the one-letter commands? A genius did that.

Let's see what the `l` command does.
```
(Pdb) h l
l(ist) [first [,last] | .]

        List source code for the current file.  Without arguments,
        list 11 lines around the current line or continue the previous
        listing.  With . as argument, list 11 lines around the current
        line.  With one argument, list 11 lines starting at that line.
        With two arguments, list the given range; if the second
        argument is less than the first, it is a count.

        The current line in the current frame is indicated by "->".
        If an exception is being debugged, the line where the
        exception was originally raised or propagated is indicated by
        ">>", if it differs from the current line.
(Pdb) 
```

Really?
```
(Pdb) l
441             :param output_file: path + filename where the srpm should be written, defaults to cwd
442             :param srpm_dir: path to the directory where the srpm is meant to be placed
443             :return: a path to the srpm
444             """
445             breakpoint()
446  ->         self.up.run_action(actions=ActionName.post_upstream_clone)
447  
448             try:
449                 self.up.prepare_upstream_for_srpm_creation(upstream_ref=upstream_ref)
450             except Exception as ex:
451                 raise PackitSRPMException(
```

Neat.

## Debuggers, level 2

[pdb](https://docs.python.org/3/library/pdb.html#module-pdb) debugger is good,
but [ipdb](https://github.com/gotcha/ipdb) is even better - it has colors and completion.

```
$ packit srpm
Packit 0.9.1.dev2+gd4f6f93 is being used.
> /home/tt/g/user-cont/packit/packit/api.py(446)create_srpm()
    445         import ipdb; ipdb.set_trace()
--> 446         self.up.run_action(actions=ActionName.post_upstream_clone)
    447 

ipdb> l
    441         :param output_file: path + filename where the srpm should be written, defaults to cwd
    442         :param srpm_dir: path to the directory where the srpm is meant to be placed
    443         :return: a path to the srpm
    444         """
    445         import ipdb; ipdb.set_trace()
--> 446         self.up.run_action(actions=ActionName.post_upstream_clone)
    447 
    448         try:
    449             self.up.prepare_upstream_for_srpm_creation(upstream_ref=upstream_ref)
    450         except Exception as ex:
    451             raise PackitSRPMException(

ipdb> 
```

The output is now colored. Trust me, I'm an engineer.

### What commands should you know?

* `n` — execute current statement and go to the **n**ext one
* `w` — **w**here are we in the call stack?
* `u` — go one level **u**p in the stack
* `d` — guess (yes, it's to go one level **d**own)
* `l` — you've seen this one a**l**ready (show code)
* `c` — **c**ontinue the execution (until next breakpoint or the end of the program)
* `s` — **s**tep into current function (similar to `d`)
* `q` — **q**uit the program right now
* `b` — set a **b**eerpoint, I mean breakpoint


## Debuggers, level 99

Let's talk about some tips & tricks:

* Always put breakpoints as close as possible to the place where you think is a
problem (also on the proper level of the call stack), so you don't spend too
much time of doing `n`, `s`, `u`, `d`...

* When using pytest, run it with `-s` because pytest captures stdin and your
test would fail with `OSError: reading from stdin while output is captured`.

* When in debugger, run real python code: print things, define new vars,
override things, go bananas.

* It's efficient to use multiple breakpoints and `c` between them.

* You can debug any python code like this: in case of a traceback, just put
breakpoint in the place where the exception happened, rerun and check what's
wrong.


Have fun!

