---
title: "Running logdetective service in containers with CUDA on EC2"
date: "2024-08-15T10:00:00+02:00"
draft: false
tags: ["AI", "LLM", "RPM"]
---
This is a follow up to my previous post ["Running logdetective on an EC2 VM
with CUDA"]({{< ref "logdetective-ec2-cuda.md" >}}). Though this time, we'll
run the service and do our first inference!

From the previous post, we already have:
1. All steps to create a Containerfile
2. The EC2 VM with Tesla T4
3. Podman set up

<!--more-->

In the meantime I containerized the service, though without any acceleration:
[#fedora-copr/logdetective/51](https://github.com/fedora-copr/logdetective/pull/51).
There are two containers:
1. Logdetective fastapi webserver with only a single endpoint
2. Llama-cpp server for the inference


## CUDA-enabled Containerfile

I just took the containerfile from the PR above and:
1. Based it on F39 - no CUDA for F40 just yet
2. Added Nvidia's repo and installed cuda and nvidia drivers
3. Replaced some RPMs with wheels as they were not available on F39

The gist:
```
FROM fedora:39
COPY ./cuda.repo /etc/yum.repos.d/
RUN dnf install -y python3-requests python3-pip gcc gcc-c++ python3-scikit-build git-core \
    && dnf module enable -y nvidia-driver:555-dkms \
    && dnf install -y cuda-compiler-12-5 cuda-toolkit-12-5 nvidia-driver-cuda-libs \
    && dnf clean all
ENV CMAKE_ARGS="-DGGML_CUDA=on"
ENV PATH=${PATH}:/usr/local/cuda-12.5/bin/
RUN pip3 install llama_cpp_python==0.2.85 starlette drain3 sse-starlette starlette-context fastapi \
    pydantic-settings fastapi[standard] \
    && mkdir /src

COPY ./logdetective/ /src/logdetective/
```

I had to force podman to commit layers in `/tmp` as there was not enough space
in `/var/tmp` (which is a small rootfs in our case).
```
$ TMPDIR=/tmp podman build ...
```

## GPU in the container

In theory, we could mount whole /dev inside the container, but Nvidia has a
much nicer solution for podman:
[CDI](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/cdi-support.html#running-a-workload-with-cdi).
Using the `nvidia-container-toolkit` we'll generate a file that describes our
GPU and use the file as a configuration for our podman containers. Neat!

```
[root@ip-172-30-1-209 ~]# nvidia-ctk cdi generate --output=/etc/cdi/nvidia.yaml
INFO[0000] Using /usr/lib64/libnvidia-ml.so.555.42.06
INFO[0001] Auto-detected mode as 'nvml'
INFO[0002] Selecting /dev/nvidia0 as /dev/nvidia0
INFO[0004] Using driver version 555.42.06
...
INFO[0004] Selecting /usr/bin/nvidia-smi as /usr/bin/nvidia-smi
INFO[0004] Selecting /usr/bin/nvidia-debugdump as /usr/bin/nvidia-debugdump
INFO[0004] Selecting /usr/bin/nvidia-persistenced as /usr/bin/nvidia-persistenced
INFO[0004] Selecting /usr/bin/nvidia-cuda-mps-control as /usr/bin/nvidia-cuda-mps-control
INFO[0004] Selecting /usr/bin/nvidia-cuda-mps-server as /usr/bin/nvidia-cuda-mps-server
INFO[0004] Generated CDI spec with version 0.8.0
```

And now we can use the GPU in our containers.
```
$ podman run --rm --device nvidia.com/gpu=all --security-opt=label=disable logdetective nvidia-smi -L
GPU 0: Tesla T4 (UUID: GPU-cbe42d69-39d0-3664-bbf9-5de0e63cdfae)
```

Note that the drivers should always match (i.e. in the container I had
different version than on the host, so I had to match them)


## Networking problems

Unfortunately, DNS did not work inside the container and I didn't have the patience to debug it.

```
HTTPSConnectionPool(host='kojipkgs.fedoraproject.org', port=443): Max retries exceeded with url: //work/tasks/9154/121559154/build.log (Caused by NewConnectionError('<urllib3.connection.HTTPSC onnection object at 0x7f9821dfb2f0>: Failed to establish a new connection: [Errno -3] Temporary failure in name resolution'))"}
```

Clearly there is an issue with the network that compose creates for each
project. There is a DNS plugin in there, but even when I disabled the plugin,
the DNS wouldn't function properly.
```
$ podman network create --label io.podman.compose.project=logdetective --label com.docker.compose.project=logdetective --disable-dns logdetective_host
```

I decided to run it under root first to confirm logdetective service actually works.


## Did it work?

llama-cpp got the GPU:
```
$ nvidia-smi
Thu Aug 15 11:30:27 2024
+-----------------------------------------------------------------------------------------+
| NVIDIA-SMI 555.42.06              Driver Version: 555.42.06      CUDA Version: 12.5     |
|-----------------------------------------+------------------------+----------------------+
| GPU  Name                 Persistence-M | Bus-Id          Disp.A | Volatile Uncorr. ECC |
| Fan  Temp   Perf          Pwr:Usage/Cap |           Memory-Usage | GPU-Util  Compute M. |
|                                         |                        |               MIG M. |
|=========================================+========================+======================|
|   0  Tesla T4                       Off |   00000000:00:1E.0 Off |                    0 |
| N/A   32C    P0             28W /   70W |     277MiB /  15360MiB |      0%      Default |
|                                         |                        |                  N/A |
+-----------------------------------------+------------------------+----------------------+

+-----------------------------------------------------------------------------------------+
| Processes:                                                                              |
|  GPU   GI   CI        PID   Type   Process name                              GPU Memory |
|        ID   ID                                                               Usage      |
|=========================================================================================|
|    0   N/A  N/A    527552      C   python3                                       274MiB |
+-----------------------------------------------------------------------------------------+
```

Containers were up, so I sent q request to our logdetective API:
```
$ curl --header "Content-Type: application/json" --request POST --data '{"url":"https://kojipkgs.fedoraproject.org//work/tasks/9154/121559154/build.log"}' http://localhost:8080/analyze
{
    "id":"...",
    "created": 1723721448,
    "model": "/models/mistral-7b-instruct-v0.2.Q4_K_M.gguf",
    "choices": [{\"text\":
        "[Snippet 1]: The first snippet is a log message indicating that the child process exited with status code 0, which signifies successful completion. However, it also contains an error message from GHC (Glasgow Haskell Compiler) while building the package 'ghc-HSH'.
        [X] : A child process completed successfully but there was an error during build of a package using GHC.
        [Snippet 2]: The second snippet is a compilation error from GHC indicating that it expected a specific type 'OpenFileFlags' in the third argument of the 'openFd' function, but received 'Nothing'. This suggests that there might be an issue with the package dependencies or its configuration.
        [X] : An error occurred during the build process involving incorrect types in a GHC function call.
        Combining these snippets:
        Based on the given log snippets, it appears that during the build of the 'ghc-HSH' package using RPM and mockbuild tools, an error was encountered while calling the 'openFd' function in Haskell code with incorrect arguments. Specifically, instead of providing 'OpenFileFlags', the function received 'Nothing'.
        To resolve this issue, it is recommended to:
        1. Check if there are any missing or outdated dependencies for the 'ghc-HSH' package.
        2. Ensure that the Haskell source code uses the correct type for the third argument of the 'openFd' function.
        3. Update the RPM spec file and mockbuild configuration to use the latest versions of required tools and libraries.
        4. If necessary, consult the upstream documentation or community for assistance in resolving the issue.}
```

The output from logdetective is decent, it could be more detailed but definitely a great start. It's possible not enough data was present in the log.

llama-cpp inference data:
```
[llama-cpp] | llama_print_timings:        load time =    1608.05 ms
[llama-cpp] | llama_print_timings:      sample time =     204.66 ms /   372 runs   (    0.55 ms per token,  1817.68 tokens per second)
[llama-cpp] | llama_print_timings: prompt eval time =    4587.68 ms /  1506 tokens (    3.05 ms per token,   328.27 tokens per second)
[llama-cpp] | llama_print_timings:        eval time =  120915.03 ms /   371 runs   (  325.92 ms per token,     3.07 tokens per second)
[llama-cpp] | llama_print_timings:       total time =  126168.24 ms /  1877 tokens
[llama-cpp] | INFO:     10.89.0.2:53452 - "POST /v1/completions HTTP/1.1" 200 OK
[server]    | INFO:     10.89.0.1:44872 - "POST /analyze HTTP/1.1" 200 OK
```

2 minute total inference time - that's quite a lot.

## Next steps

1. Security - we need to put some kind of authorization in front of the logdetective webserver
2. Production deployment: we need to define and automate the deployment, this was just the first iteration
3. Interface - provide a user interface so it's easily usable by the Fedora community
