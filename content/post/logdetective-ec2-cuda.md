---
title: "Running logdetective on a EC2 VM with CUDA"
date: "2024-07-30T15:00:00+02:00"
draft: false
tags: ["AI", "LLM", "RPM"]
---

This is a followup to [my previous blog about running logdetective]({{< ref "logdetective-rhoai-cuda.md" >}}) on RHOAI with CUDA.

Here we're starting with a fresh EC2 VM that has a nvidia GPU.

We have two challenges ahead of us:

1. **Storage**: CUDA takes a lot of space so we need to think ahead where we'll store gigabytes of these binaries.

2. **GCC**: Right now CUDA support gcc from F39, while we have F40 as our host system.

We'll run a F39 container rootless with the graphroot stored on an external volume to address both issues.

<!--more-->

## Containers storage on an external volume

...with SELinux enforcing!

SELinux doesn't like this so we need to [tell it](https://github.com/containers/storage/blob/main/docs/containers-storage.conf.5.md#storage-table) about our actions.

We'll edit configuration for our rootless podman:

```
$ vi ~/.config/containers/storage.conf
graphroot = "/mnt/srv/repos/ttomecek/containers-storage"
```

and then "fix" SELinux:
```
# semanage fcontext -a -e /var/lib/containers/storage /mnt/srv/repos/ttomecek/containers-storage
# restorecon -R /mnt/srv/repos/ttomecek/containers-storage
```

(semanage binary is in `policycoreutils-python-utils` in case it's missing)

for some reason, I also had to change the cgroups manager:
```
$ vi ~/.config/containers/containers.conf
cgroup_manager = "cgroupfs"
```

Now I could run rootless containers.

## Compiling llama-cpp-python with CUDA acceleration

We'll do the steps below in the F39 container:
```
$ podman run -ti registry.fedoraproject.org/fedora:39 bash
```

### 1. Add CUDA repo

```
[root@71b5836b5870 /]# cat /etc/yum.repos.d/cuda-fedora39.repo
[cuda-fedora39-x86_64]
name=cuda-fedora39-x86_64
baseurl=https://developer.download.nvidia.com/compute/cuda/repos/fedora39/x86_64
enabled=1
gpgcheck=1
gpgkey=https://developer.download.nvidia.com/compute/cuda/repos/fedora39/x86_64/D42D0685.pub
```

### 2. Install CUDA stuff

```
[root@71b5836b5870 /]# dnf module enable nvidia-driver:latest-dkms
[root@71b5836b5870 /]# dnf install cuda-compiler-12-5 cuda-toolkit-12-5 nvidia-driver-cuda-libs
```

All the binaries are in a dedicated namespaced directory, we need to fix PATH so the `nvcc` compiler can be found.

```
export PATH=$PATH:/usr/local/cuda-12.5/bin/
```

### 3. Install more dev stuff for compilation

```
[root@71b5836b5870 /]# dnf install python3-pip git-core gcc
```

### 4. Compilation!

```
[root@71b5836b5870 /]# CMAKE_ARGS="-DGGML_CUDA=on" pip install llama-cpp-python
Collecting llama-cpp-python
  Using cached llama_cpp_python-0.2.84.tar.gz (49.3 MB)
  Installing build dependencies ... done
  Getting requirements to build wheel ... done
  Installing backend dependencies ... done
  Preparing metadata (pyproject.toml) ... done
Collecting typing-extensions>=4.5.0 (from llama-cpp-python)
  Obtaining dependency information for typing-extensions>=4.5.0 from https://files.pythonhosted.org/packages/26/9f/ad63fc0248c5379346306f8668cda6e2e2e9c95e01216d2b8ffd9ff037d0/typing_extensions-4.12.2-py3-none-any.whl.metadata
  Using cached typing_extensions-4.12.2-py3-none-any.whl.metadata (3.0 kB)
Collecting numpy>=1.20.0 (from llama-cpp-python)
  Obtaining dependency information for numpy>=1.20.0 from https://files.pythonhosted.org/packages/2c/f3/61eeef119beb37decb58e7cb29940f19a1464b8608f2cab8a8616aba75fd/numpy-2.0.1-cp312-cp312-manylinux_2_17_x86_64.manylinux2014_x86_64.
whl.metadata
  Using cached numpy-2.0.1-cp312-cp312-manylinux_2_17_x86_64.manylinux2014_x86_64.whl.metadata (60 kB)

...

Using cached diskcache-5.6.3-py3-none-any.whl (45 kB)
Using cached jinja2-3.1.4-py3-none-any.whl (133 kB)
Using cached numpy-2.0.1-cp312-cp312-manylinux_2_17_x86_64.manylinux2014_x86_64.whl (19.2 MB)
Using cached typing_extensions-4.12.2-py3-none-any.whl (37 kB)
Using cached MarkupSafe-2.1.5-cp312-cp312-manylinux_2_17_x86_64.manylinux2014_x86_64.whl (28 kB)
Building wheels for collected packages: llama-cpp-python
  Building wheel for llama-cpp-python (pyproject.toml) ... done
  Created wheel for llama-cpp-python: filename=llama_cpp_python-0.2.84-cp312-cp312-linux_x86_64.whl size=256705967 sha256=7cc8c89b399062fdf1817fd4a4342463f0df59c014a8e5ebcab68bfe4186600b
  Stored in directory: /root/.cache/pip/wheels/ab/77/de/0a8a5f93fad9a027c28b044aa8e0fd202b58bfd58936a1983d
Successfully built llama-cpp-python
Installing collected packages: typing-extensions, numpy, MarkupSafe, diskcache, jinja2, llama-cpp-python
Successfully installed MarkupSafe-2.1.5 diskcache-5.6.3 jinja2-3.1.4 llama-cpp-python-0.2.84 numpy-2.0.1 typing-extensions-4.12.2
```

We can do logdetective now
```
[root@71b5836b5870 /]# pip install logdetective
Collecting logdetective
  Obtaining dependency information for logdetective from https://files.pythonhosted.org/packages/e2/4b/73fb05ef59b4c910c185b519b0919f1f8375aabe0890bac8d0e2190c7448/logdetective-0.2.3-py3-none-any.whl.metadata
  Downloading logdetective-0.2.3-py3-none-any.whl.metadata (8.1 kB)
Collecting drain3<0.10.0,>=0.9.11 (from logdetective)
  Downloading drain3-0.9.11.tar.gz (27 kB)
  Installing build dependencies ... done
  Getting requirements to build wheel ... done
  Preparing metadata (pyproject.toml) ... done

...

Downloading urllib3-2.2.2-py3-none-any.whl (121 kB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 121.4/121.4 kB 21.8 MB/s eta 0:00:00
Downloading filelock-3.15.4-py3-none-any.whl (16 kB)
Building wheels for collected packages: drain3
  Building wheel for drain3 (pyproject.toml) ... done
  Created wheel for drain3: filename=drain3-0.9.11-py3-none-any.whl size=23991 sha256=64470c49536b99e77810f44a13a0cdc13bccbd068156552c7b3031342eebf913
  Stored in directory: /root/.cache/pip/wheels/3f/d1/46/58e1747b3d77c4990f838e1c1f610f5aab1a21889cc9bff5c2
Successfully built drain3
Installing collected packages: urllib3, tqdm, pyyaml, packaging, jsonpickle, idna, fsspec, filelock, charset-normalizer, certifi, cachetools, requests, drain3, huggingface-hub, logdetective
Successfully installed cachetools-4.2.1 certifi-2024.7.4 charset-normalizer-3.3.2 drain3-0.9.11 filelock-3.15.4 fsspec-2024.6.1 huggingface-hub-0.23.5 idna-3.7 jsonpickle-1.5.1 logdetective-0.2.3 packaging-24.1 pyyaml-6.0.1 requests
-2.32.3 tqdm-4.66.4 urllib3-2.2.2
```

We have the container env now ready. But, it still can't work because the GPU is not exposed there.

That would be the future work:
1. Turn that `^` into a Containerfile
2. Launch the container with `/dev/` available inside so the GPU is available

Using [nvidia-container-toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html) will make it the easiest to do the 2nd part.
