---
title: "Comparing llama-cpp and vllm in model serving"
date: 2024-11-01T10:00:00+02:00
draft: false
tags: ["AI", "LLM", "RPM"]
---

In Log Detective, we're struggling with scalability right now. We are running
an LLM serving service in the background using llama-cpp. Since users will
interact with it, we need to make sure they'll get a solid experience and won't
need to wait minutes to get an answer. Or even worse, see nasty errors.

What's going to happen when 5, 15 or 10000 people try Log Detective service at
the same time?

Let's start the research.

<img src="/img/autumn2024.JPG" alt="Autumn in southern Moravia" style="width: 640px;">

<!--more-->

## Baseline

```
$ curl --header "Content-Type: application/json" --request POST --data '{"url":"https://kojipkgs.fedoraproject.org//work/tasks/3660/125393660/build.log"}' http://logdetective01.fedorainfracloud.org:8080/analyze
```

```
llama_print_timings:        load time =  101479.05 ms
llama_print_timings:      sample time =     367.67 ms /   665 runs   (    0.55 ms per token,  1808.67 tokens per second)
llama_print_timings: prompt eval time =  280211.87 ms /  1383 tokens (  202.61 ms per token,     4.94 tokens per second)
llama_print_timings:        eval time =  226793.25 ms /   664 runs   (  341.56 ms per token,     2.93 tokens per second)
llama_print_timings:       total time =  508408.72 ms /  2047 tokens
```

That was slow! It turns out the model was not running on the GPU, let's fix that.

This is the proper baseline.

```
llama_print_timings:        load time =     673.90 ms
llama_print_timings:      sample time =     356.28 ms /   665 runs   (    0.54 ms per token,  1866.49 tokens per second)
llama_print_timings: prompt eval time =    1615.53 ms /  1383 tokens (    1.17 ms per token,   856.06 tokens per second)
llama_print_timings:        eval time =   21856.69 ms /   664 runs   (   32.92 ms per token,    30.38 tokens per second)
llama_print_timings:       total time =   24816.17 ms /  2047 tokens
```

That's a 20x speed up, neat. GPUs indeed work.


## 3 runs in parallel

I'm going to fire three parallel, identical curl requests.
```
llama_print_timings:        load time =     673.90 ms
llama_print_timings:      sample time =     357.33 ms /   665 runs   (    0.54 ms per token,  1861.02 tokens per second)
llama_print_timings: prompt eval time =       0.00 ms /     0 tokens (    -nan ms per token,     -nan tokens per second)
llama_print_timings:        eval time =   21964.06 ms /   665 runs   (   33.03 ms per token,    30.28 tokens per second)
llama_print_timings:       total time =   23229.93 ms /   665 tokens
INFO:     10.89.0.176:48124 - "POST /v1/completions HTTP/1.1" 200 OK
Llama.generate: prefix-match hit

llama_print_timings:        load time =     673.90 ms
llama_print_timings:      sample time =     360.19 ms /   665 runs   (    0.54 ms per token,  1846.24 tokens per second)
llama_print_timings: prompt eval time =       0.00 ms /     0 tokens (    -nan ms per token,     -nan tokens per second)
llama_print_timings:        eval time =   21992.75 ms /   665 runs   (   33.07 ms per token,    30.24 tokens per second)
llama_print_timings:       total time =   23242.53 ms /   665 tokens
INFO:     10.89.0.176:57480 - "POST /v1/completions HTTP/1.1" 200 OK
Llama.generate: prefix-match hit

llama_print_timings:        load time =     673.90 ms
llama_print_timings:      sample time =     345.84 ms /   665 runs   (    0.52 ms per token,  1922.84 tokens per second)
llama_print_timings: prompt eval time =       0.00 ms /     0 tokens (    -nan ms per token,     -nan tokens per second)
llama_print_timings:        eval time =   22015.24 ms /   665 runs   (   33.11 ms per token,    30.21 tokens per second)
llama_print_timings:       total time =   23272.29 ms /   665 tokens
INFO:     10.89.0.176:53458 - "POST /v1/completions HTTP/1.1" 200 OK
```
The timings are similar to the first run. We are getting roughly 30 tokens/s in eval.

The problem is all three were computed serially. And since the mistral model
only takes one third of our GPU's memory, we're wasting our potential:
```
|=========================================+========================+
|   0  Tesla T4                       Off |   00000000:00:1E.0 Off |
| N/A   37C    P0             26W /   70W |    4463MiB /  15360MiB |
|                                         |                        |
+-----------------------------------------+------------------------+
```
We have a tracking issue for this:
[fedora-copr/logdetective#82](https://github.com/fedora-copr/logdetective/issues/82).
[Jirka](https://github.com/jpodivin) was researching running 3 llama-cpp containers and loadbalancing via
nginx.


## [vllm](https://docs.vllm.ai/en/latest/getting_started/installation.html)

InstructLab is using this engine so let's see if it can improve things for us.

I just extended our Containerfile with `pip install vllm`. Since both vllm and
llama-cpp-server implement the OpenAI inference API, we can switch between them
easily. That's the theory.

### Installation

Since we already install torch and cuda in our container, that simple `pip
install` just worked for the installation.

Though running `vllm` wasn't as straightforward because torch could find several cuda libraries, the fix was:
```
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/usr/local/lib/python3.12/site-packages/nvidia/cudnn/lib:/usr/local/lib/python3.12/site-packages/nvidia/nccl/lib
```

It's odd that these are not available already from RPMs in the standard library
location. I need to investigate further.

### Model

We need to download the mistral 7B model again because vllm right now only has
experimental [GGUF
support](https://docs.vllm.ai/en/latest/quantization/gguf.html). This means
that our comparison here between llama-cpp and vllm won't be fair, because we
are using 4-bit quantization with llama-cpp:
`mistral-7b-instruct-v0.2.Q4_K_S.gguf`. We'll continue with downloading the
original mistral 7B v0.2 model.

```
$ huggingface-cli download --local-dir /models mistralai/Mistral-7B-Instruct-v0.2
```

### Serving

Who would have guessed it... More problems.

```
ValueError: Bfloat16 is only supported on GPUs with compute capability of at least 8.0. Your Tesla T4 GPU has compute capability 7.5. You can use float16 instead by explicitly setting the`dtype` flag in CLI, for example: --dtype=half.
```

I followed the official docs with `--dtype=auto`. It's funny that the `auto`
argument won't set the value if vllm already knows how to fix this problem 😁.
`--dtype=half` indeed fixed it, thanks for the guidance, vllm.

Welp, we need quantized version of mistral, because our T4 is tiny.
```
torch.OutOfMemoryError: Error in model execution (input dumped to
/tmp/err_execute_model_input_20241101-095338.pkl): CUDA out of memory. Tried to
allocate 256.00 MiB. GPU 0 has a total capacity of 14.57 GiB of which 54.75 MiB
is free. Including non-PyTorch memory, this process has 0 bytes memory in use.
Of the allocated memory 14.38 GiB is allocated by PyTorch, and 4.61 MiB is
reserved by PyTorch but unallocated. If reserved but unallocated memory is
large try setting PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True to avoid
fragmentation.  See documentation for Memory Management
(https://pytorch.org/docs/stable/notes/cuda.html#environment-variables)
```

Sadly I can't find *mistral 7B 0.2 GPTQ* model on hugging face. We may need to quantize it ourselves.

I'll go with `neuralmagic/Mistral-7B-Instruct-v0.3-GPTQ-4bit` in the meantime.
Funnily enough, `--dtype auto` worked just fine. Which I can't say for the API
implementation.

## API differences

Our code casted API arguments from int to str which I assume is for sake of
llama-cpp's OpenAI API implementation. vllm did not like that:
```
  File "/usr/local/lib64/python3.12/site-packages/vllm/entrypoints/openai/protocol.py", line 677, in check_logprobs
    if (logprobs := data.get("logprobs")) is not None and logprobs < 0:
                                                          ^^^^^^^^^^^^
TypeError: '<' not supported between instances of 'str' and 'int'
```

This was easy to fix.

The next problem just showcases the API implementations are vastly different:
```
{'type': 'missing', 'loc': ('body', 'model'), 'msg': 'Field required',
```

It tells me that I need to specify the model in my request. This is pretty
funny because my server runs only a single model, so... I don't really see the
point. It took me many attempts to figure out how exactly I should specify the
model name. The documentation doesn't say a thing. All I could find was using
the HF's `namespace/model` syntax.

> The model `neuralmagic/Mistral-7B-Instruct-v0.3-GPTQ-4bit` does not exist.

Which didn't work.

Thankfully, vllm implements an API that lists available models:
```
$ curl 0.0.0.0:8000/v1/models
{"object":"list","data":[{"id":"/models/Mistral-7B-Instruct-v0.3-GPTQ-4bit/","object":"model","created":1730458756,"owned_by":"vllm","root":"/models/Mistral-7B-Instruct-v0.3-GPTQ-4bit/","parent":null,"max_model_len":32768,"permission":[{"id":"modelperm-8f5f54123d80498babb7aa41a9e02d2d","object":"model_permission","created":1730458756,"allow_create_engine":false,"allow_sampling":true,"allow_logprobs":true,"allow_search_indices":false,"allow_view":true,"allow_fine_tuning":false,"organization":"*","group":null,"is_blocking":false}]}]}
```

So the name of our model is indeed its path.

## The first vllm response

Finally success!!!

```
{
  "explanation": {
    "id": "cmpl-8e082f5bf18346e7aca0d96bc21c12ea",
    "object": "text_completion",
    "created":1730458842,
    "model":"/models/Mistral-7B-Instruct-v0.3-GPTQ-4bit/",
    "choices":[{
      "text": "[1] : [The package build encountered an error during execution
        of rpmbuild command with bad exit status, indicated by 'error: Bad exit status
        from /var/tmp/rpm-tmp.3G45c1 (%build)'. It is possible that the build failed
        due to errors in dependencies, compiler or libraries used by t
        he package, or there are errors in scripts inside the SPECS/ikona.spec file.
        The error could be traced to the Systemd namespace spawn command, as the
        snippet highlights. However, this snippet is a part of Python exception
        traceback and needed context is missing to definitively state the cause.]\n\n
              [2] : [Package build failed because of failing rpmbuild command.
        The exit status for rpmbuild was not 0, instead it was 2. This could be due to
        the reasons mentioned in analysis for log snippet [1].]\n\n
              [3] : [The log snippet illustrates the exit code of the child
        process and indicates that the error's origin was from the execution of the
        rpmbuild command. The child returned code was 101, an un common exit code,
        suggesting a non-default error related to the libraries, files, or package
        configuration.]\n\n
              [4] : [The log snippet warns about deprecated usage of the
        '%patchN' instead of using \"%patch N\", valid only for 'rpm- build 4.15.0' and
        newer. It's likely that this build was using an older version of rpm-build, as
        the deprecated usage is outdated.]\n\n
              [5] : [Traceback of an exception, originating from 'mockbuild'
        package, implying that the package was the one that experienced a failure. The
        exception is an instance of 'Error' originating from generated rpmbuild
        commands. The command was \"/usr/bin/rpmbuild -bb --noclean --target x86_64
        --nodeps /builddir/build/SPECS/ikona.sp ec\", and the output from the command
        was logged, preceded with 'Command failed: ']\n\n
              Conclusion:\n\nThe package build encountered an error during
        execution of rpmbuild command with bad exit status, originating from Systemd
        namespa ce spawn command ['/usr/bin/systemd-nspawn']. It is likely there were
        issues with dependencies, compiler or libraries used by the package, or errors
        in scripts inside the SPECS/ikona.spec file. Additionally, it appears that RPM
        vers ion was old as the '%patchN' usage was deprecated.\n\nTo resolve this
        issue, follow these steps:\n\n
          1. Update rpm and its dependant packages to the latest version, if
            not already installed (prevents deprecated features).\n
          2. Verify the rpmbuild
            commands and configurations in the SPECS/ikona.spec file for syntax errors or
            broken dependencies.\n
          3. Compile the package first without '--nodeps' flag and
            see whether it builds without errors.\n
          4. Check the compiler v ersion and
            ensure it is compatable with the package source code.\n
          5. If there are any
            unresolved issues, consider creating a bug report upstream."
```

The certainty is pretty low:
```
"usage":{"prompt_tokens":1383,"completion_tokens":684,"total_tokens":2067}},"response_certainty":50.434688194745135}
```

Stats for this query:
```
INFO 11-01 11:00:45 metrics.py:349] Avg prompt throughput: 144.4 tokens/s, Avg generation throughput: 0.1 tokens/s, Running: 1 reqs, Swapped: 0 reqs, Pending: 0 reqs, GPU KV cache usage: 4.1%, CPU KV cache usage: 0.0%.
INFO 11-01 11:00:50 metrics.py:349] Avg prompt throughput: 0.0 tokens/s, Avg generation throughput: 50.3 tokens/s, Running: 1 reqs, Swapped: 0 reqs, Pending: 0 reqs, GPU KV cache usage: 4.9%, CPU KV cache usage: 0.0%.
```

The throughput of 144.4 tokens/s is amazing. Though we're mostly interested in generation: 50.3 tokens/s.

## vllm: 3 parallel queries

The first query was solved fast, the other 2 took quite some time to show. Stats:
```
INFO 11-01 11:12:17 metrics.py:349] Avg prompt throughput: 183.9 tokens/s, Avg generation throughput: 0.1 tokens/s, Running: 1 reqs, Swapped: 0 reqs, Pending: 0 reqs, GPU KV cache usage: 4.1%, CPU KV cache usage: 0.0%.
INFO 11-01 11:12:22 metrics.py:349] Avg prompt throughput: 0.0 tokens/s, Avg generation throughput: 51.9 tokens/s, Running: 1 reqs, Swapped: 0 reqs, Pending: 0 reqs, GPU KV cache usage: 4.9%, CPU KV cache usage: 0.0%.
INFO 11-01 11:12:27 metrics.py:349] Avg prompt throughput: 0.0 tokens/s, Avg generation throughput: 51.4 tokens/s, Running: 1 reqs, Swapped: 0 reqs, Pending: 0 reqs, GPU KV cache usage: 5.7%, CPU KV cache usage: 0.0%.
INFO:     10.89.0.187:40870 - "POST /v1/completions HTTP/1.1" 200 OK
INFO 11-01 11:12:32 metrics.py:349] Avg prompt throughput: 276.2 tokens/s, Avg generation throughput: 29.0 tokens/s, Running: 1 reqs, Swapped: 0 reqs, Pending: 0 reqs, GPU KV cache usage: 4.3%, CPU KV cache usage: 0.0%.
INFO 11-01 11:12:37 metrics.py:349] Avg prompt throughput: 0.0 tokens/s, Avg generation throughput: 51.8 tokens/s, Running: 1 reqs, Swapped: 0 reqs, Pending: 0 reqs, GPU KV cache usage: 5.1%, CPU KV cache usage: 0.0%.
INFO 11-01 11:12:42 metrics.py:349] Avg prompt throughput: 0.0 tokens/s, Avg generation throughput: 51.4 tokens/s, Running: 1 reqs, Swapped: 0 reqs, Pending: 0 reqs, GPU KV cache usage: 5.8%, CPU KV cache usage: 0.0%.
INFO 11-01 11:12:47 metrics.py:349] Avg prompt throughput: 0.0 tokens/s, Avg generation throughput: 51.0 tokens/s, Running: 1 reqs, Swapped: 0 reqs, Pending: 0 reqs, GPU KV cache usage: 6.6%, CPU KV cache usage: 0.0%.
INFO 11-01 11:12:52 metrics.py:349] Avg prompt throughput: 0.0 tokens/s, Avg generation throughput: 50.6 tokens/s, Running: 1 reqs, Swapped: 0 reqs, Pending: 0 reqs, GPU KV cache usage: 7.3%, CPU KV cache usage: 0.0%.
INFO 11-01 11:12:57 metrics.py:349] Avg prompt throughput: 0.0 tokens/s, Avg generation throughput: 50.0 tokens/s, Running: 1 reqs, Swapped: 0 reqs, Pending: 0 reqs, GPU KV cache usage: 8.1%, CPU KV cache usage: 0.0%.
INFO 11-01 11:13:02 metrics.py:349] Avg prompt throughput: 0.0 tokens/s, Avg generation throughput: 49.5 tokens/s, Running: 1 reqs, Swapped: 0 reqs, Pending: 0 reqs, GPU KV cache usage: 8.8%, CPU KV cache usage: 0.0%.
INFO 11-01 11:13:07 metrics.py:349] Avg prompt throughput: 0.0 tokens/s, Avg generation throughput: 48.7 tokens/s, Running: 1 reqs, Swapped: 0 reqs, Pending: 0 reqs, GPU KV cache usage: 9.5%, CPU KV cache usage: 0.0%.
INFO:     10.89.0.187:42030 - "POST /v1/completions HTTP/1.1" 200 OK
INFO 11-01 11:13:12 metrics.py:349] Avg prompt throughput: 238.0 tokens/s, Avg generation throughput: 29.6 tokens/s, Running: 1 reqs, Swapped: 0 reqs, Pending: 0 reqs, GPU KV cache usage: 4.1%, CPU KV cache usage: 0.0%.
INFO 11-01 11:13:17 metrics.py:349] Avg prompt throughput: 0.0 tokens/s, Avg generation throughput: 51.6 tokens/s, Running: 1 reqs, Swapped: 0 reqs, Pending: 0 reqs, GPU KV cache usage: 4.9%, CPU KV cache usage: 0.0%.
INFO 11-01 11:13:22 metrics.py:349] Avg prompt throughput: 0.0 tokens/s, Avg generation throughput: 51.3 tokens/s, Running: 1 reqs, Swapped: 0 reqs, Pending: 0 reqs, GPU KV cache usage: 5.7%, CPU KV cache usage: 0.0%.
INFO 11-01 11:13:27 metrics.py:349] Avg prompt throughput: 0.0 tokens/s, Avg generation throughput: 50.8 tokens/s, Running: 1 reqs, Swapped: 0 reqs, Pending: 0 reqs, GPU KV cache usage: 6.4%, CPU KV cache usage: 0.0%.
INFO 11-01 11:13:32 metrics.py:349] Avg prompt throughput: 0.0 tokens/s, Avg generation throughput: 50.3 tokens/s, Running: 1 reqs, Swapped: 0 reqs, Pending: 0 reqs, GPU KV cache usage: 7.2%, CPU KV cache usage: 0.0%.
INFO 11-01 11:13:37 metrics.py:349] Avg prompt throughput: 0.0 tokens/s, Avg generation throughput: 49.9 tokens/s, Running: 1 reqs, Swapped: 0 reqs, Pending: 0 reqs, GPU KV cache usage: 8.0%, CPU KV cache usage: 0.0%.
INFO 11-01 11:13:42 metrics.py:349] Avg prompt throughput: 0.0 tokens/s, Avg generation throughput: 49.3 tokens/s, Running: 1 reqs, Swapped: 0 reqs, Pending: 0 reqs, GPU KV cache usage: 8.7%, CPU KV cache usage: 0.0%.
INFO:     10.89.0.187:37810 - "POST /v1/completions HTTP/1.1" 200 OK
INFO 11-01 11:13:56 metrics.py:349] Avg prompt throughput: 0.0 tokens/s, Avg generation throughput: 13.6 tokens/s, Running: 0 reqs, Swapped: 0 reqs, Pending: 0 reqs, GPU KV cache usage: 0.0%, CPU KV cache usage: 0.0%.
```
We can see the generation throughput is consistently around 50 tokens/s.

Funnily enough the tree responses got very high certainty rates compared to
50.43 above.
```
"usage":{"prompt_tokens":1383,"completion_tokens":616,"total_tokens":1999}},"response_certainty":99.98351011459158}
"usage":{"prompt_tokens":1383,"completion_tokens":1986,"total_tokens":3369}},"response_certainty":99.98435027025123}
"usage":{"prompt_tokens":1383,"completion_tokens":1710,"total_tokens":3093}},"response_certainty":99.98171663860825}
```

The first response is shorter, that's why it was so fast. The other two are
longer, and hence it took longer to compute them.

## Conclussion

I'm glad we can now compare two different serving engines: vllm and llama-cpp.

It took me 2 working days to go through all of this. I won't deny it's
frustrating running into endless problems.

One of the next steps has to be running the same model in both: ideally with
4-bit quantization.

The final patch in our codebase:

```diff
diff --git a/.env b/.env
index 0aedbda..0f22697 100644
--- a/.env
+++ b/.env
@@ -3,7 +3,8 @@
 LLAMA_CPP_SERVER_PORT=8000
 LLAMA_CPP_HOST=llama-cpp-server
 LOGDETECTIVE_SERVER_PORT=8080
-MODEL_FILEPATH=/models/mistral-7b-instruct-v0.2.Q4_K_S.gguf
+LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/usr/local/lib/python3.12/site-packages/nvidia/cudnn/lib:/usr/local/lib/python3.12/site-packages/nvidia/nccl/lib
+MODEL_FILEPATH=/models/Mistral-7B-Instruct-v0.3-GPTQ-4bit/
 # for some reason, fastapi cripples sys.path and some deps cannot be found
 PYTHONPATH=/src:/usr/local/lib64/python3.12/site-packages:/usr/lib64/python312.zip:/usr/lib64/python3.12/:/usr/lib64/python3.12/lib-dynload:/usr/local/lib/python3.12/site-packages:/usr/lib64/python3.12/site-packages:/usr/lib/python
3.12/site-packages
 LLM_NGPUS=-1
```

```diff
diff --git a/Containerfile.cuda b/Containerfile.cuda
index 5bd69a7..770d42d 100644
--- a/Containerfile.cuda
+++ b/Containerfile.cuda
@@ -13,7 +13,7 @@ RUN dnf install -y python3-requests python3-pip gcc gcc-c++ python3-scikit-build
 ENV CMAKE_ARGS="-DGGML_CUDA=on"
 ENV PATH=${PATH}:/usr/local/cuda-12.5/bin/
 # some of these are either not in F39 or have old version
-RUN pip3 install llama_cpp_python==0.2.85 starlette drain3 sse-starlette starlette-context \
+RUN pip3 install llama_cpp_python==0.2.85 starlette drain3 sse-starlette starlette-context vllm \
     pydantic-settings fastapi[standard] \
     && mkdir /src
 COPY ./logdetective/ /src/logdetective/logdetective
```

```diff
diff --git a/docker-compose.yaml b/docker-compose.yaml
index ec1002c..ed65c6a 100644
--- a/docker-compose.yaml
+++ b/docker-compose.yaml
@@ -1,12 +1,9 @@
 version: "3"
 services:
-  llama-cpp:
-    image: logdetective/runtime:latest-cuda
-    build:
-      context: .
-      dockerfile: ./Containerfile.cuda
+  vllm:
+    image: quay.io/logdetective/runtime:cuda-vllm
     hostname: "${LLAMA_CPP_HOST}"
-    command: "python3 -m llama_cpp.server --model ${MODEL_FILEPATH} --host 0.0.0.0 --port ${LLAMA_CPP_SERVER_PORT} --n_gpu_layers ${LLM_NGPUS:-0}"
+    command: "vllm serve ${MODEL_FILEPATH} --host 0.0.0.0 --port ${LLAMA_CPP_SERVER_PORT} --dtype=auto"
     stdin_open: true
     tty: true
     env_file: .env
```

```diff
diff --git a/logdetective/server.py b/logdetective/server.py
index f862eba..2b77b78 100644
--- a/logdetective/server.py
+++ b/logdetective/server.py
@@ -120,7 +120,7 @@ def mine_logs(log: str) -> List[str]:

     return log_summary

-async def submit_text(text: str, max_tokens: int = 0, log_probs: int = 1, stream: bool = False):
+async def submit_text(text: str, max_tokens: int = 4000, log_probs: int = 1, stream: bool = False):
     """Submit prompt to LLM.
     max_tokens: number of tokens to be produces, 0 indicates run until encountering EOS
     log_probs: number of token choices to produce log probs for
@@ -128,8 +128,9 @@ async def submit_text(text: str, max_tokens: int = 0, log_probs: int = 1, stream
     LOG.info("Analyzing the text")
     data = {
             "prompt": text,
-            "max_tokens": str(max_tokens),
-            "logprobs": str(log_probs),
+            "max_tokens": max_tokens,
+            "logprobs": log_probs,
+            "model": "/models/Mistral-7B-Instruct-v0.3-GPTQ-4bit/",
             "stream": stream}

```
