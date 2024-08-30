---
title: "Using InstructLab in Log Detective"
date: 2024-08-29T06:00:00+02:00
draft: false
tags: ["AI", "LLM", "RPM"]
---

We are going to continue in the Log Detective series:
1. [Introducing Log Detective]({{< ref "log-detective.md" >}})
1. [Running logdetective on Red Hat OpenShift AI with CUDA]({{< ref "logdetective-rhoai-cuda.md" >}})
1. [Running logdetective on an EC2 VM with CUDA]({{< ref "logdetective-ec2-cuda.md" >}})
1. [Running logdetective service in containers with CUDA on EC2]({{< ref "running-logdetective-service-on-cuda-ec2.md" >}})

This time we'll start exploring using [InstructLab](https://github.com/instructlab/) in the Log Detective infrastructure.

In this first post, we'll obtain InstructLab and start the exploration. We will use the official RHEL AI container image.

<!--more-->

## Get the image

We will pull the nvidia instructlab image from catalog.redhat.com.

```
$ podman pull registry.redhat.io/rhelai1/instructlab-nvidia-rhel9:1.1

Trying to pull registry.redhat.io/rhelai1/instructlab-nvidia-rhel9:1.1...
Error: initializing source docker://registry.redhat.io/rhelai1/instructlab-nvidia-rhel9:1.1: unable to retrieve auth token: invalid username/password: unauthorized: Please login to the Red Hat Registry using your Customer Portal credentials. Further instructions can be found here: https://access.redhat.com/RegistryAuthentication
```

Oh right, we need to log in. Just create a service account [here](https://access.redhat.com/terms-based-registry/) and log in with it.

We also need to tell podman to use `/tmp` as the temporary storage and not `/var/tmp`, see the previous posts.
```
$ TMPDIR=/tmp podman pull registry.redhat.io/rhelai1/instructlab-nvidia-rhel9:1.1
Trying to pull registry.redhat.io/rhelai1/instructlab-nvidia-rhel9:1.1...
Getting image source signatures
Checking if image destination supports signatures
Copying blob f7ba8ba42f88 done   |
Copying config a992f0f0e0 done   |
Writing manifest to image destination
Storing signatures
a992f0f0e08e602977f228873426cf64757c50781184fc66994f4888923cc047
```

## Try CUDA

Does GPU acceleration work? We will use the CDI specification we created previously. Let's see if we see the GPU inside:
```
$ podman run --rm --device nvidia.com/gpu=all --security-opt=label=disable registry.redhat.io/rhelai1/instructlab-nvidia-rhel9:1.1 n
vidia-smi

NVIDIA Release  (build )
Container image Copyright (c) 2024, NVIDIA CORPORATION & AFFILIATES. All ri...
+-----------------------------------------------------------------------------------------+
| NVIDIA-SMI 555.42.06              Driver Version: 555.42.06      CUDA Version: 12.4     |
|-----------------------------------------+------------------------+----------------------+
| GPU  Name                 Persistence-M | Bus-Id          Disp.A | Volatile Uncorr. ECC |
| Fan  Temp   Perf          Pwr:Usage/Cap |           Memory-Usage | GPU-Util  Compute M. |
|                                         |                        |               MIG M. |
|=========================================+========================+======================|
|   0  Tesla T4                       Off |   00000000:00:1E.0 Off |                    0 |
| N/A   31C    P0             28W /   70W |       1MiB /  15360MiB |     12%      Default |
|                                         |                        |                  N/A |
+-----------------------------------------+------------------------+----------------------+

+-----------------------------------------------------------------------------------------+
| Processes:                                                                              |
|  GPU   GI   CI        PID   Type   Process name                              GPU Memory |
|        ID   ID                                                               Usage      |
|=========================================================================================|
|  No running processes found                                                             |
+-----------------------------------------------------------------------------------------+
```
Nice, works! Especially impressive because nvidia drivers are not present inside. podman mounts them in from host using the CDI spec.


## InstructLab, first shot

```
$ podman run --rm -ti --device nvidia.com/gpu=all --security-opt=label=disable registry.redhat.io/rhelai1/instructlab-nvidia-rhel9:1.1 bash

[root@pytorch /]# ilab
Usage: ilab [OPTIONS] COMMAND [ARGS]...

  CLI for interacting with InstructLab.

  If this is your first time running ilab, it's best to start with `ilab
  config init` to create the environment.

Options:
  --config PATH  Path to a configuration file.  [default: /opt/app-
                 root/src/.config/instructlab/config.yaml]
  -v, --verbose  Enable debug logging (repeat for even more verbosity)
  --version      Show the version and exit.
  --help         Show this message and exit.

Commands:
  config    Command Group for Interacting with the Config of InstructLab.
  data      Command Group for Interacting with the Data generated by...
  model     Command Group for Interacting with the Models in InstructLab.
  system    Command group for all system-related command calls
  taxonomy  Command Group for Interacting with the Taxonomy of InstructLab.

Aliases:
  chat      model chat
  convert   model convert
  diff      taxonomy diff
  download  model download
  evaluate  model evaluate
  generate  data generate
  init      config init
  list      model list
  serve     model serve
  sysinfo   system info
  test      model test
  train     model train
```

Hello!

```
[root@pytorch /]# ilab sysinfo
You are using an aliased command, this will be deprecated in a future release. Please consider using `ilab system info` instead
Some ilab storage directories do not exist yet. Please run `ilab config init` before continuing.
```
Thanks for guiding us! I really like when the tool gives you exact commands to run.

## Setting up InstructLab

```
[root@pytorch /]# ilab config init
Found /opt/app-root/src/.local/share/instructlab/internal/train_configuration/profiles, do you also want to reset existing profiles? [y/N]: y
Welcome to InstructLab CLI. This guide will help you to setup your environment.
Please provide the following values to initiate the environment [press Enter for defaults]:
Generating `/opt/app-root/src/.config/instructlab/config.yaml` and `/opt/app-root/src/.local/share/instructlab/internal/train_configuration/profiles`...
Please choose a train profile to use:
[0] No profile (CPU-only)
[1] A100_H100_x2.yaml
[2] A100_H100_x4.yaml
[3] A100_H100_x8.yaml
[4] L40_x4.yaml
[5] L40_x8.yaml
[6] L4_x8.yaml
Enter the number of your choice [hit enter for the default CPU-only profile] [0]:
```

This is unfortunate. Our VM has only one Tesla T4 GPU, certainly not 8x A100. It would be nice if ilab detected our GPU setup. We'll go `0` in the meantime and edit the config manually.
```
Enter the number of your choice [hit enter for the default CPU-only profile] [0]: 0
Using default CPU-only train profile.
Initialization completed successfully, you're ready to start using `ilab`. Enjoy!
```

## Let's try `generate`

We're brave (together with [Jirka Podivin](https://github.com/jpodivin), trying this out). Using the default taxonomy, let's try generating new synthetic data.
```
[root@pytorch taxonomy]# ilab data generate
INFO 2024-08-29 09:39:53,275 numexpr.utils:161: NumExpr defaulting to 4 threads.
INFO 2024-08-29 09:39:54,928 datasets:59: PyTorch version 2.3.1 available.
Failed to determine backend: Cannot determine which backend to use: Failed to determine whether the model is a GGUF format: [Errno 2] No such file or directory: '/opt/app-root/src/.cache/instructlab/models/mixtral-8x7b-instruct-v0-1'
```

This is odd, why don't ilab just fetch the model? It doesn't tell us where and how to obtain the model.

Honestly, we got stuck on this for some time and switched to merlinite because it was really unclear what we should actually fetch.
