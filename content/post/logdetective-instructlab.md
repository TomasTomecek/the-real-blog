---
title: "Using InstructLab in Log Detective"
date: 2024-09-06T12:00:00+02:00
draft: false
tags: ["AI", "LLM", "RPM"]
---

We are going to continue in the Log Detective series:
1. [Introducing Log Detective]({{< ref "log-detective.md" >}})
1. [Running logdetective on Red Hat OpenShift AI with CUDA]({{< ref "logdetective-rhoai-cuda.md" >}})
1. [Running logdetective on an EC2 VM with CUDA]({{< ref "logdetective-ec2-cuda.md" >}})
1. [Running logdetective service in containers with CUDA on EC2]({{< ref "running-logdetective-service-on-cuda-ec2.md" >}})

This time we'll start exploring using [InstructLab](https://github.com/instructlab/) in the Log Detective infrastructure.

In this first post, we'll obtain InstructLab and start the exploration. We will
use the official RHEL AI container image that got recently released:
https://www.redhat.com/en/about/press-releases/red-hat-enterprise-linux-ai-now-generally-available-enterprise-ai-innovation-production

![Eggplant flower in our garden](/img/eggplant-flower.JPG)

<!--more-->

## Get the image

We will pull the nvidia instructlab image from catalog.redhat.com.

```
$ podman pull registry.redhat.io/rhelai1/instructlab-nvidia-rhel9:1.1

Trying to pull registry.redhat.io/rhelai1/instructlab-nvidia-rhel9:1.1...
Error: initializing source docker://registry.redhat.io/rhelai1/instructlab-nvidia-rhel9:1.1: unable to retrieve auth token: invalid username/password: unauthorized: Please login to the Red Hat Registry using your Customer Portal credentials. Further instructions can be found here: https://access.redhat.com/RegistryAuthentication
```

Oh right, we need to log in. Just create a service account [here](https://access.redhat.com/terms-based-registry/) and log in with it.

We also need to tell podman to use `/tmp` as the temporary storage and not
`/var/tmp`, see the previous posts why (TL;DR our storage limitations).
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

This is unfortunate. Our VM has only one Tesla T4 GPU, certainly not 8x A100.
It would be nice if ilab detected our GPU setup. [There is an RFE for
this](https://github.com/instructlab/instructlab/issues/2155). We'll go `0` in
the meantime and edit the config manually.
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
Failed to determine backend: Cannot determine which backend to use:
  Failed to determine whether the model is a GGUF format:
  [Errno 2] No such file or directory: '/opt/app-root/src/.cache/instructlab/models/mixtral-8x7b-instruct-v0-1'
```

This is odd, why don't ilab just fetch the model? It doesn't tell us where and how to obtain the model.

Honestly, we got stuck on this for some time and switched to merlinite because it was really unclear what we should actually fetch.


## Fetch mixtral model

The mixtral model is used for data generation and we need to fetch it from registry.redhat.io

We'll login using the service account mentioned above (`skopeo login ...`).

And fetch the model like this:
```
[root@pytorch /]# ilab model download --repository docker://registry.redhat.io/rhelai1/mixtral-8x7b-instruct-v0-1 --release 1.1
Downloading model from OCI registry: docker://registry.redhat.io/rhelai1/mixtral-8x7b-instruct-v0-1@1.1 to /opt/app-root/src/.cache/instructlab/models...
Copying blob d0b63fca793c [=======================>--------------] 2.9GiB / 4.6GiB | 73.6 MiB/s
Copying blob 40e6ecbcedfc done   |
Copying blob 54669c5aec29 [=========================>------------] 3.2GiB / 4.6GiB | 156.2 MiB/s
Copying blob 801135aff52b done   |
Copying blob 9d56d04b36d0 done   |
Copying blob 29e15364d8ab [--------------------------------------] 11.6MiB / 4.6GiB | 149.5 KiB/s
Copying blob 67e0596920fe [==============================>-------] 3.8GiB / 4.6GiB | 49.2 MiB/s
Copying blob e330eabd70b4 [======================>---------------] 2.8GiB / 4.6GiB | 277.3 MiB/s
Copying blob 048fa5347877 [========================>-------------] 3.1GiB / 4.6GiB | 235.8 MiB/s
```

Please note the model is more than 70 GB big.

You can verify that you can access the registry:
```
$ skopeo list-tags docker://registry.redhat.io/rhelai1/mixtral-8x7b-instruct-v0-1
{
    "Repository": "registry.redhat.io/rhelai1/mixtral-8x7b-instruct-v0-1",
    "Tags": [
        "1.1",
        "1.1.0",
        "1.1-1724888130",
        "latest",
        "sha256-11197540805870251664006be034d21181993692faf3a0e3d4d4149fa58cd37c",
        "sha256-11197540805870251664006be034d21181993692faf3a0e3d4d4149fa58cd37c.att",
        "sha256-11197540805870251664006be034d21181993692faf3a0e3d4d4149fa58cd37c.sbom",
        "sha256-11197540805870251664006be034d21181993692faf3a0e3d4d4149fa58cd37c.sig"
    ]
}
```


## Preparing knowledge

We can create knowledge, a yaml document, and feed it to instructlab to have a finetuned model.

Please follow the official documentation: [docs.redhat.com/../creating_a_custom_llm_using_rhel_ai/customize_taxonomy_tree#customize_llm_knowledge_example](
https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_ai/1.1/html/creating_a_custom_llm_using_rhel_ai/customize_taxonomy_tree#customize_llm_knowledge_example)

The schema changed between versions of instructlab so make sure you are using the right schema.

We'll cover a knowledge doc for Log Detective in the next post.

