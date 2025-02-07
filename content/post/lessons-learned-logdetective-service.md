---
title: "Lessons learned from running the Log Detective service"
date: 2025-02-07T10:00:00+02:00
draft: false
tags: ["AI", "LLM", "RPM"]
---

[Log Detective service is
live](https://fedora-copr.github.io/posts/logdetective-explain) for more than
two weeks now. Running an LLM inference server in production is a challenge.

We started with llama-cpp-python's server initialy but [switched](https://github.com/fedora-copr/logdetective/issues/108) over to
llama-cpp server because of its parallel execution feature. I still need to
benchmark it to see how much speedup we are getting.

<img src="/img/moon.JPG" alt="Night moon" style="width: 640px;">

This blog post highlights a few common challenges you might face when operating an inference server.

<!--more-->

## You need a GPU

I hope this one is obvious. Right now the stock LLMs perform very poorly on a
CPU (roughly 3 tokens per second). If you intend to process thousands of
tokens per minute - you need a GPU. We are getting 30-40 tokens per second with
llama-server on Nvidia T4.

If you use Nvidia, the first command to run after installing drivers and cuda is:
```
# nvidia-smi
Thu Jan 23 13:56:45 2025
+-----------------------------------------------------------------------------------------+
| NVIDIA-SMI 560.35.05              Driver Version: 560.35.05      CUDA Version: 12.6     |
|-----------------------------------------+------------------------+----------------------+
| GPU  Name                 Persistence-M | Bus-Id          Disp.A | Volatile Uncorr. ECC |
| Fan  Temp   Perf          Pwr:Usage/Cap |           Memory-Usage | GPU-Util  Compute M. |
|                                         |                        |               MIG M. |
|=========================================+========================+======================|
|   0  Tesla T4                       Off |   00000000:00:1E.0 Off |                    0 |
| N/A   39C    P0             65W /   70W |   10285MiB /  15360MiB |     85%      Default |
|                                         |                        |                  N/A |
+-----------------------------------------+------------------------+----------------------+
```

## Model layers need to be loaded in GPU memory

It's fascinating this is not the default behavior for the inference servers. You need to explicitly tell them to load layers in the GPU memory. Also, the configuration syntax differs:
* llama-cpp-python server accepts `-1` as: load all layers
* llama-cpp doesn't, you need to give it a positive number

So if the performance sucks, verify this first. You want to see similar log lines:
```
load_tensors: offloading 32 repeating layers to GPU
load_tensors: offloading output layer to GPU
load_tensors: offloaded 33/33 layers to GPU
```

## Your server uses the GPU

Once again, we can do this with `nvidia-smi`.
```
+-----------------------------------------------------------------------------------------+
| Processes:                                                                              |
|  GPU   GI   CI        PID   Type   Process name                              GPU Memory |
|        ID   ID                                                               Usage      |
|=========================================================================================|
|    0   N/A  N/A   1117974      C   llama-server                                10282MiB |
+-----------------------------------------------------------------------------------------+
```
We are using llama-server above and it loaded 10GB of model layers into the GPU memory.

It's also good to verify your torch installation:
```
>>> import torch

>>> torch.cuda.is_available()
True

>>> torch.cuda.device_count()
1
```


I could write more about installing Nvidia drivers and cuda, compiling the
inference server against cuda, but let's leave it for the next one.

I really find entertaining all the doom speak about AI taking over the
world. It's so hard to run all of this software. Once AI learns how to operate
itself better than humans, then we should worry. I would want to join a tmux
session with such an AI service an observe.
