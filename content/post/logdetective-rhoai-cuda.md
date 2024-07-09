---
title: "Running logdetective on Red Hat OpenShift AI with CUDA"
date: "2024-07-09T08:15:00+02:00"
draft: false
tags: ["AI", "LLM", "RPM"]
---

Let's run [Logdetective](https://logdetective.com/) in [Red Hat OpenShift
AI](https://docs.redhat.com/en/documentation/red_hat_openshift_ai_cloud_service/1)
using a Jupyter notebook with
[llama-cpp-python](https://github.com/abetlen/llama-cpp-python) and CUDA.

<img src="/img/detective.jpg" alt="Microsoft Designer: Futuristic detective who inspects shiny crystals, comics style." style="width: 640px;">

<!--more-->

I picked up a pytorch+cuda image for my notebook:

> CUDA v12.1, Python v3.9, PyTorch v2.2  
> 12 CPU, 16Gi Memory  
> NVIDIA GPU - use sparingly  


## What CUDA do we have?

```
[1]: print(torch.cuda.get_device_name(0))
NVIDIA A10G

[2]: print(torch.version.cuda)
12.1
```

We can also run `nvidia-smi` in terminal to get more details:
```
(app-root) (app-root) nvidia-smi 
Tue Jul  9 12:23:37 2024       
+-----------------------------------------------------------------------------+
| NVIDIA-SMI 525.105.17   Driver Version: 525.105.17   CUDA Version: 12.1     |
|-------------------------------+----------------------+----------------------+
| GPU  Name        Persistence-M| Bus-Id        Disp.A | Volatile Uncorr. ECC |
| Fan  Temp  Perf  Pwr:Usage/Cap|         Memory-Usage | GPU-Util  Compute M. |
|                               |                      |               MIG M. |
|===============================+======================+======================|
|   0  NVIDIA A10G         On   | 00000000:00:1E.0 Off |                    0 |
|  0%   40C    P0    72W / 300W |  20586MiB / 23028MiB |      0%      Default |
|                               |                      |                  N/A |
+-------------------------------+----------------------+----------------------+
                                                                               
+-----------------------------------------------------------------------------+
| Processes:                                                                  |
|  GPU   GI   CI        PID   Type   Process name                  GPU Memory |
|        ID   ID                                                   Usage      |
|=============================================================================|
+-----------------------------------------------------------------------------+
```


## Install accelerated llama-cpp-python

We can either compile it ourself or download a prebuilt wheel. We'll do the latter.

```
[3]: !pip install llama-cpp-python --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cu121
Looking in indexes: https://pypi.org/simple, https://abetlen.github.io/llama-cpp-python/whl/cu121
Collecting llama-cpp-python
  Downloading https://github.com/abetlen/llama-cpp-python/releases/download/v0.2.82-cu121/llama_cpp_python-0.2.82-cp39-cp39-linux_x86_64.whl (287.3 MB)
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 287.3/287.3 MB 213.5 MB/s eta 0:00:0000:0100:01
Requirement already satisfied: jinja2>=2.11.3 in /opt/app-root/lib/python3.9/site-packages (from llama-cpp-python) (3.1.4)
Requirement already satisfied: numpy>=1.20.0 in /opt/app-root/lib/python3.9/site-packages (from llama-cpp-python) (1.26.4)
Requirement already satisfied: typing-extensions>=4.5.0 in /opt/app-root/lib/python3.9/site-packages (from llama-cpp-python) (4.11.0)
Collecting diskcache>=5.6.1
  Downloading diskcache-5.6.3-py3-none-any.whl (45 kB)
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 45.5/45.5 kB 6.2 MB/s eta 0:00:00
Requirement already satisfied: MarkupSafe>=2.0 in /opt/app-root/lib/python3.9/site-packages (from jinja2>=2.11.3->llama-cpp-python) (2.1.5)
Installing collected packages: diskcache, llama-cpp-python
Successfully installed diskcache-5.6.3 llama-cpp-python-0.2.82
```

CUDA version from previous step is important because we need to download the
specific build of llama-cpp-python.

Now we can install logdetective
```
(app-root) (app-root) pip3 install logdetective
Processing /opt/app-root/src/logdetective
  Installing build dependencies ... done
  Getting requirements to build wheel ... done
  Preparing metadata (pyproject.toml) ... done
Requirement already satisfied: requests<3.0.0,>=2.31.0 in /opt/app-root/lib/python3.9/site-packages (from logdetective==0.2.2) (2.32.2)
Collecting drain3<0.10.0,>=0.9.11
  Downloading drain3-0.9.11.tar.gz (27 kB)
  Preparing metadata (setup.py) ... done
Collecting huggingface-hub<0.24.0,>=0.23.2
  Downloading huggingface_hub-0.23.4-py3-none-any.whl (402 kB)
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 402.6/402.6 kB 36.8 MB/s eta 0:00:00
Requirement already satisfied: llama-cpp-python<0.3.0,>=0.2.56 in /opt/app-root/lib/python3.9/site-packages (from logdetective==0.2.2) (0.2.82)
Collecting jsonpickle==1.5.1
  Downloading jsonpickle-1.5.1-py2.py3-none-any.whl (37 kB)
Collecting cachetools==4.2.1
  Downloading cachetools-4.2.1-py3-none-any.whl (12 kB)
Requirement already satisfied: pyyaml>=5.1 in /opt/app-root/lib/python3.9/site-packages (from huggingface-hub<0.24.0,>=0.23.2->logdetective==0.2.2) (6.0.1)
Requirement already satisfied: typing-extensions>=3.7.4.3 in /opt/app-root/lib/python3.9/site-packages (from huggingface-hub<0.24.0,>=0.23.2->logdetective==0.2.2) (4.11.0)
Requirement already satisfied: tqdm>=4.42.1 in /opt/app-root/lib/python3.9/site-packages (from huggingface-hub<0.24.0,>=0.23.2->logdetective==0.2.2) (4.66.4)
Requirement already satisfied: filelock in /opt/app-root/lib/python3.9/site-packages (from huggingface-hub<0.24.0,>=0.23.2->logdetective==0.2.2) (3.14.0)
Requirement already satisfied: fsspec>=2023.5.0 in /opt/app-root/lib/python3.9/site-packages (from huggingface-hub<0.24.0,>=0.23.2->logdetective==0.2.2) (2024.5.0)
Requirement already satisfied: packaging>=20.9 in /opt/app-root/lib/python3.9/site-packages (from huggingface-hub<0.24.0,>=0.23.2->logdetective==0.2.2) (24.0)
Requirement already satisfied: numpy>=1.20.0 in /opt/app-root/lib/python3.9/site-packages (from llama-cpp-python<0.3.0,>=0.2.56->logdetective==0.2.2) (1.26.4)
Requirement already satisfied: diskcache>=5.6.1 in /opt/app-root/lib/python3.9/site-packages (from llama-cpp-python<0.3.0,>=0.2.56->logdetective==0.2.2) (5.6.3)
Requirement already satisfied: jinja2>=2.11.3 in /opt/app-root/lib/python3.9/site-packages (from llama-cpp-python<0.3.0,>=0.2.56->logdetective==0.2.2) (3.1.4)
Requirement already satisfied: certifi>=2017.4.17 in /opt/app-root/lib/python3.9/site-packages (from requests<3.0.0,>=2.31.0->logdetective==0.2.2) (2024.2.2)
Requirement already satisfied: urllib3<3,>=1.21.1 in /opt/app-root/lib/python3.9/site-packages (from requests<3.0.0,>=2.31.0->logdetective==0.2.2) (1.26.18)
Requirement already satisfied: charset-normalizer<4,>=2 in /opt/app-root/lib/python3.9/site-packages (from requests<3.0.0,>=2.31.0->logdetective==0.2.2) (3.3.2)
Requirement already satisfied: idna<4,>=2.5 in /opt/app-root/lib/python3.9/site-packages (from requests<3.0.0,>=2.31.0->logdetective==0.2.2) (3.7)
Requirement already satisfied: MarkupSafe>=2.0 in /opt/app-root/lib/python3.9/site-packages (from jinja2>=2.11.3->llama-cpp-python<0.3.0,>=0.2.56->logdetective==0.2.2) (2.1.5)
Building wheels for collected packages: logdetective, drain3
  Building wheel for logdetective (pyproject.toml) ... done
  Created wheel for logdetective: filename=logdetective-0.2.2-py3-none-any.whl size=14659 sha256=42916ae28ef04a602b2bd16b6a7037e9391319606dd6d5f99e28f23622252db2
  Stored in directory: /tmp/pip-ephem-wheel-cache-2scz_pfg/wheels/1e/ed/af/08ba400005f26c62dd48ff6c1e5e40657055f3a1c54304a08c
  Building wheel for drain3 (setup.py) ... done
  Created wheel for drain3: filename=drain3-0.9.11-py3-none-any.whl size=23991 sha256=87406d8f9b820f564343fceab3a984e0b76fd4e65186139b7660baf56630be24
  Stored in directory: /tmp/pip-ephem-wheel-cache-2scz_pfg/wheels/88/00/3d/40bb5aa370e00b4bf67a4cd22e7817771d3d0b65a33adc3afa
Successfully built logdetective drain3
Installing collected packages: jsonpickle, cachetools, huggingface-hub, drain3, logdetective
  Attempting uninstall: cachetools
    Found existing installation: cachetools 5.3.3
    Uninstalling cachetools-5.3.3:
      Successfully uninstalled cachetools-5.3.3
Successfully installed cachetools-4.2.1 drain3-0.9.11 huggingface-hub-0.23.4 jsonpickle-1.5.1 logdetective-0.2.2
```

## Model

By default we are using Mistral 7B Instruct but for some reason it doesn't fit
in the GPU memory. Which is totally odd since we use quantized version that
only has 4G.

Anyway, let's give Llama 3 a shot.

We'll download it with the hugging face CLI:
```
(app-root) (app-root) huggingface-cli download Orenguteng/Llama-3-8B-Lexi-Uncensored-GGUF Lexi-Llama-3-8B-Uncensored_Q4_K_M.gguf
Downloading 'Lexi-Llama-3-8B-Uncensored_Q4_K_M.gguf' to '/opt/app-root/src/.cache/huggingface/hub/models--Orenguteng--Llama-3-8B-Lexi-Uncensored-GGUF/blobs/3f3a13eb3fbc7a52c11f075cd72e476117fc4a9fbc8d93c8e3145bc54bf10a17.incomplete' (resume from 3965063168/4920733952)
Lexi-Llama-3-8B-Uncensored_Q4_K_M.gguf: 100%|████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████| 4.92G/4.92G [00:04<00:00, 212MB/s]
Download complete. Moving file to /opt/app-root/src/.cache/huggingface/hub/models--Orenguteng--Llama-3-8B-Lexi-Uncensored-GGUF/blobs/3f3a13eb3fbc7a52c11f075cd72e476117fc4a9fbc8d93c8e3145bc54bf10a17
/opt/app-root/src/.cache/huggingface/hub/models--Orenguteng--Llama-3-8B-Lexi-Uncensored-GGUF/snapshots/55cb207db4f777bdf8836d0ac5986c661280822b/Lexi-Llama-3-8B-Uncensored_Q4_K_M.gguf
```

## Logdetective

We can now finally run logdetective:
```
(app-root) (app-root) logdetective -v -M Orenguteng/Llama-3-8B-Lexi-Uncensored-GGUF -F Q4_K_M.gguf ./install.log
INFO:logdetective:Getting summary
DEBUG:logdetective:{'change_type': 'cluster_created', 'cluster_id': 1, 'cluster_size': 1, 'template_mined': 'ERROR: Could not find a version that satisfies the requirement asdkefnmwklenfwef (from versions: none)', 'cluster_count': 1}
DEBUG:logdetective:{'change_type': 'cluster_created', 'cluster_id': 2, 'cluster_size': 1, 'template_mined': 'ERROR: No matching distribution found for asdkefnmwklenfwef', 'cluster_count': 2}
DEBUG:logdetective:{'change_type': 'cluster_created', 'cluster_id': 3, 'cluster_size': 1, 'template_mined': '[notice] A new release of pip available: <:NUM:>.<:NUM:>.<:NUM:> -> <:NUM:>.<:NUM:>.<:NUM:>', 'cluster_count': 3}
DEBUG:logdetective:{'change_type': 'cluster_created', 'cluster_id': 4, 'cluster_size': 1, 'template_mined': '[notice] To update, run: pip install --upgrade pip', 'cluster_count': 4}
DEBUG:logdetective:Log summary: 
 ERROR: Could not find a version that satisfies the requirement asdkefnmwklenfwef (from versions: none)

ERROR: No matching distribution found for asdkefnmwklenfwef


[notice] A new release of pip available: 22.2.2 -> 24.1.2

[notice] To update, run: pip install --upgrade pip


INFO:logdetective:Compression ratio: 1.6666666666666667
INFO:logdetective:Analyzing the text
Explanation: 
[ERROR: Could not find a version that satisfies the requirement asdkefnmwklenfwef (from versions: none)] -> This error message indicates that pip was unable to find any available version of the package 'asdkefnmwklenfwef'. This is likely due to the package being non-existent or having no publicly available releases.

[ERROR: No matching distribution found for asdkefnmwklenfwef] -> This error message confirms that pip was unable to find a match for the package name in its repository of available packages. Again, this suggests that the package is either not present or does not have any public releases.

Overall, the failure occurred because the package 'asdkefnmwklenfwef' does not exist or has no publicly available releases. Pip was unable to find a version that satisfies the requirement and thus failed to install the package.

Explanation: The installation of a package failed because the package itself is invalid or non-existent. This can be caused by human error (e.g. typo) or other factors. In this case, it's likely that someone tried to install an invalid package name. Pip was unable to find any available versions of the package and thus reported a failure. The solution would be to check the spelling of the package name and try again with the correct one. If the issue persists, it may indicate a deeper problem with pip or its repository.
```

Thank you logdetective (and Llama 3), very good observation!

