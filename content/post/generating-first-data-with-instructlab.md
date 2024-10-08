---
title: "Generating first set of data for LogDetective using InstructLab"
date: "2024-09-19T15:00:00+02:00"
draft: false
tags: ["AI", "LLM", "RPM"]
---

In the last blog ([Using InstructLab in Log Detective]({{< ref
"logdetective-instructlab.md" >}})), we went through the installation and set
up process for InstructLab. The post finished with knowledge preparation. We'll
continue with that and hopefully end this one with data generated by InstructLab.

![Fennel flower in our garden](/img/fennel-flower.JPG)

<!--more-->

## [Knowledge](https://github.com/instructlab/taxonomy?tab=readme-ov-file#getting-started-with-knowledge-contributions) or [skill](https://github.com/instructlab/taxonomy?tab=readme-ov-file#getting-started-with-skill-contributions)?

Based on what you want to achieve, you have to decide if you intend to create a skill or knowledge.

Let's cite the taxonomy readme here:

> Skills require a much smaller volume of content than knowledge contributions. An entire skill contribution to the taxonomy tree can be just a few lines of YAML in the qna.yaml file ("qna" is short for "questions and answers") and an attribution.txt file for citing sources.

> While skills are foundational or performative, knowledge is based more on answering questions that involve facts, data, or references.
> Knowledge is supported by documents, such as a textbook, technical manual, encyclopedia, journal, or magazine.

In our case, processing logs, we go for knowledge. We created our own taxonomy repository: https://github.com/fedora-copr/logdetective-taxonomy

## Tips

* I started with a big knowledge doc: `ilab` wasn't happy about it. You should start with only a handful seed examples and extend over time.
* The `document` section of knowledge type is crucial, make sure to fill it with high quality info. You should provide intro into your problem space followed by detailed data forming the knowledge. The subsequent context and Q/A pairs should extend that document knowledge.
* If you are on InstructLab 0.18, and don't have big enough GPUs to host fullblown mixtral 8x7B, you can use quantized mixtral: `TheBloke/Mixtral-8x7B-Instruct-v0.1-GPTQ`
* It can happen that some requests would time out, or don't fit model's context window. Consider shortening your input docs, or fiddling with `data generate` attributes. For me, this worked the best: `ilab data generate --model ~/.cache/instructlab/models/TheBloke/Mixtral-8x7B-Instruct-v0.1-GPTQ --gpus 4 --pipeline full --enable-serving-output --batch-size 4 --sdg-scale-factor 12 --chunk-word-count 600`

If you are in doubt, please follow the official documentation: [docs.redhat.com/../creating_a_custom_llm_using_rhel_ai/customize_taxonomy_tree#customize_llm_knowledge_example](
https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_ai/1.1/html/creating_a_custom_llm_using_rhel_ai/customize_taxonomy_tree#customize_llm_knowledge_example)

## What did `ilab` generate?

Let's go through what `ilab` generated for us.

### Input

Our knowledge input looked like this:
```
created_by: Log Detective Team
document:
  commit: HEAD
  patterns:
  - knowledge.md
  repo: https://github.com/fedora-copr/logdetective-taxonomy
document_outline: Resolving RPM build failures
domain: software
seed_examples:
- "context": |-
    + ant -Dant.java.version=1.8 prepare-dist
    Error: could not find libjava.so
    Error: Could not find Java SE Runtime
     Environment.
  "questions_and_answers":
  - "answer": |-
      ant fails to load libjava.so
    "question": |-
      Explain log snippets from an RPM build.
  - "answer": |-
      No idea, fails on COPR, working fine on build.opensuse.org
    "question": |-
      How can I resolve the issue?
  - "answer": |-
      For some reason openjdk is not properly installed.  Note that same source RPM build succeeds on
      build.opensuse.org for same EPEL 7 package
    "question": |-
      What is the reason the build has failed?
```
I provided 7 seed examples.

The document:
```
# Resolving RPM build problems

LogDetective helps you understand why your RPM build failed using the build
log. It analyzes logs using a Large Language Model (LLM) and Drain template
miner. Based on your input log, LogDetective will explain why the build failed
and will suggest a solution.

LogDetective team is building a data set with annotated logs of failures that
will help us produce high quality suggestions that target Fedora, CentOS Stream
and Red Hat Enterprise Linux ecosystems.

Here is an example of an error from the RPM build process:
\```
No matching package to install: 'go-vendor-tools'
Not all dependencies satisfied
Error: Some packages could not be found
\```

This snippet contains the error message: that the go-vendor-tools package could
not be installed.
In order to fix this, double check the package name. Make sure to build
go-vendor-tools first if it is a dependency of the current package.

Here is another example of an error from the RPM build process:
\```
error: Couldn't download https://github.com/hyprwm/${name}/archive/v0.2.0/hyprlock-0.2.0.tar.
\```

The reason the build failed, there is a typo in the `%{name}` macro. It is
incorrectly spelled as `${name}`.
```

The document starts with intro to the problem space and immediately contains snippets of logs with explanations. The context and Q/A further improves the document.


### Output

We've got 1410 jsonlines in `train_Mixtral-8x7B-Instruct-v0_2024-09-19T10_41_30.jsonl`:
```
{
    "system": "I am, Red Hat® Instruct Model based on Granite 7B, an AI
        language model developed by Red Hat and IBM Research, based on the
        Granite-7b-base language model. My primary function is to be a chat
        assistant.",
    "user": "How can users access the Logdetective Taxonomy repository?",
    "assistant": "Users can access the Logdetective Taxonomy repository by
        visiting the repository's page on GitHub. From there, they can browse the
        taxonomy, download the data, and use it to analyze their own log data."
}
{
    "system": "I am, Red Hat® Instruct Model based on Granite 7B, an AI
        language model developed by Red Hat and IBM Research, based on the
        Granite-7b-base language model. My primary function is to be a chat
        assistant.",
    "user": "What is the reason for the RPM build failure in the second error
        message snippet?",
    "assistant": "The second error message snippet indicates that the RPM build
        failed due to a typo in the `%{name}` macro, which is incorrectly spelled
        as `${name}`."
}
{
    "system": "...",
    "user": "Explain the concept of taxonomy in the context of the document.",
    "assistant": "In the context of the document, taxonomy refers to the
        classification and categorization of log snippets related to the RPM build
        process. This taxonomy is used to understand the cause of failures, errors,
        or issues that occurred during the RPM build process."
}
```
These are 3 randomly selected. You can see that InstructLab generated knowledge of Log Detective, our Taxonomy repo (which likely isn't too relevant for future users of Log Detective), and one concrete example of a failure. Sadly the macro problem is not concretely referenced, rather as "second error". This is something we may need improve in our input data.

File `knowledge_train_msgs_2024-09-19T10_41_30.jsonl` had 1419 lines, such as:
```
{
    "messages":
    [{
        "content":"I am, Red Hat\u00ae Instruct Model based on Granite 7B, an AI language model developed by Red Hat and IBM Research, based on the Granite-7b-base language model. My primary function is to be a chat assistant.",
        "role":"system"},
        {"content":"<|user|>\n# Logdetective Taxonomy\n\nThis repo contains taxonomy for [Instructlab](https:\/\/github.com\/instructlab) generated from data we collected on our website: <https:\/\/logdetective.com\/>\n\nWhat is the format of the data in the Logdetective Taxonomy repository?\n<|assistant|>\nThe data in the Logdetective Taxonomy repository is in the form of a taxonomy, which is a hierarchical system of classification that categorizes and organizes data in a meaningful way.\n",
        "role":"pretraining"}],
    "metadata":"{\"sdg_document\": \"# Logdetective Taxonomy\\n\\nThis repo contains taxonomy for [Instructlab](https:\/\/github.com\/instructlab) generated from data we collected on our website: <https:\/\/logdetective.com\/>\",
    \"domain\": \"software\",
    \"dataset\": \"document_knowledge_qa\",
    \"raw_document\": \"# Logdetective Taxonomy\\n\\nThis repo contains taxonomy for [Instructlab](https:\/\/github.com\/instructlab) generated from data we collected on our website: https:\/\/logdetective.com\/\",
    \"dataset_type\": \"spellcheck\"}",
    "id":"fa652113-c28e-44f5-acca-7dd1af677afb"}
```

And also a file called `messages_Mixtral-8x7B-Instruct-v0_2024-09-19T10_41_30.jsonl`.
```
{
    "messages":
        [{"content": "What is the role of Logdetective Taxonomy in diagnosing RPM build issues?",
            "role": "user"},
        {"content": "Logdetective Taxonomy provides a repository of taxonomy that can be used to analyze and diagnose log files and issues related to RPM builds, helping to identify the root cause of any failures or errors.",
        "role": "assistant"}],
        "metadata": "{\"system\": \"I am, Red Hat\\u00ae Instruct Model based on Granite 7B, an AI language model developed by Red Hat and IBM Research, based on the Granite-7b-base language model. My primary function is to be a chat assistant.\"}"
}
```
These last 2 files look like an internal step in InstractLab data generation. Great to see how InstructLab does it.

Thank you to [Jiri Podivin](https://github.com/jpodivin) who I closely
collaborated with on this research, [Ben Browning](https://github.com/bbrowning) for helping me out debugging the data generation process, and [Grant Shipley](https://github.com/gshipley)
for this amazing [YouTube walkthrough of
InstructLab](https://www.youtube.com/watch?v=H_dUADNfQxg).

