---
title: "Deploying agents to OpenShift, again (part 2)"
date: "2026-04-27T08:00:00+02:00"
draft: false
tags: ["AI", "Agents", "OpenShift"]
---

This is a follow-up to the [previous article](/post/deploying-agents-openshift/).

I find it so funny that I estimated the test deployment at 3 story points; at this point I'm at like 40 with the amount of work I put into this.

But thanks to Claude it's pretty fast to diagnose and solve problems.

This time I even let it run `oc` commands, even `oc rsh`, but I never allowed commands that would change things or write to remote services. Everything stayed local.

Here comes Claude's writeup.

<!--more-->

# Deployment Adventures Part 2: The CI Pipeline Edition

A chronicle of building a GitLab CI pipeline for container images — registry choices, runner mishaps, variable expansion traps, and naming mismatches. Written collaboratively by Tomas Tomecek and Claude.

---

## Chapter 1: Where Do We Build?

The agents need packages from internal Red Hat RPM repositories — `centpkg`, `rhpkg`, things that live behind the firewall. Building on GitHub Actions was never an option. The images needed to be built somewhere with access to the internal FTP.

The natural choice: GitLab CI at the internal GitLab. We created a dedicated deployment repo (`jotnar-deployment`) to hold the Containerfiles and pipeline definition, separate from the application source in `ai-workflows`. The CI pipeline clones `ai-workflows` at build time and uses it as the build context.

First question: where to push the images? Does the internal GitLab even have a container registry?

It does not. The feature is not enabled on that instance. So we went with `quay.io/jotnar` — already in use for some of the images anyway.

---

## Chapter 2: Seven Jobs, One Template

The pipeline turned out clean. A `.build` template handles login, clone, build, tag, and push. Seven jobs extend it, each setting three variables: `CONTAINERFILE`, `IMAGE_TAG`, and `SHA_TAG`.

```yaml
.build:
  stage: build
  variables:
    STORAGE_DRIVER: vfs
  before_script:
    - buildah login -u $QUAY_USER -p $QUAY_PASSWORD quay.io
  script:
    - git clone --depth 1 https://github.com/packit/ai-workflows.git
    - buildah build -f $CI_PROJECT_DIR/$CONTAINERFILE -t $IMAGE_TAG ./ai-workflows
    - buildah tag $IMAGE_TAG $SHA_TAG
    - buildah push $IMAGE_TAG
    - buildah push $SHA_TAG
```

One early trap: `buildah build -f $CONTAINERFILE ./ai-workflows` resolves the Containerfile path *relative to the build context*, not the current working directory. The Containerfiles live in `jotnar-deployment`, not in `ai-workflows`. The fix: `$CI_PROJECT_DIR/$CONTAINERFILE` to anchor the path absolutely.

---

## Chapter 3: The Local Runner Odyssey

We needed a local runner for testing the pipeline. GitLab runners are well-documented. How hard could it be?

**Attempt 1: RPM from S3**

```dockerfile
RUN curl -Lo /tmp/gitlab-runner.rpm \
    "https://gitlab-runner-downloads.s3.amazonaws.com/latest/rpm/gitlab-runner_amd64.rpm"
```

HTTP 403. The S3 bucket evidently doesn't like direct RPM downloads anymore.

**Attempt 2: Packagecloud repository**

```dockerfile
COPY <<EOF /etc/yum.repos.d/runner_gitlab-runner.repo
[runner_gitlab-runner]
baseurl=https://packages.gitlab.com/runner/gitlab-runner/fedora/$releasever/$basearch
EOF
```

404 Not Found. The `COPY <<EOF` heredoc in a Containerfile expands `$releasever` and `$basearch` as Dockerfile variables — which are undefined — producing an empty URL. (This foreshadowed a much bigger problem. More on that later.)

**Attempt 3: Static binary**

```dockerfile
RUN curl -Lo /usr/local/bin/gitlab-runner \
    "https://s3.dualstack.us-east-1.amazonaws.com/gitlab-runner-downloads/latest/binaries/gitlab-runner-linux-amd64" \
    && chmod +x /usr/local/bin/gitlab-runner
```

This worked. Sometimes the simplest approach wins after two fancier ones fail.

**The working directory ghost**

First run:

```
FATAL: chdir: no such file or directory
```

The entrypoint was configured with `--working-directory=/home/gitlab-runner`, but nobody had created that directory. One `mkdir -p` later, we were in business.

**"This job is stuck because the project doesn't have any runners online"**

The runner was up. `podman logs` showed it happily polling. GitLab disagreed. The issue: "Run untagged jobs" wasn't enabled in the GitLab UI. The runner was registered but wouldn't pick up jobs without explicit tags. A checkbox toggle in Settings > CI/CD > Runners fixed it.

---

## Chapter 4: The `COPY <<EOF` Variable Expansion Trap

With the runner working, the first full pipeline ran. Builds started. Then:

```
https://internal-ftp/.../latest-RCMTOOLS-2-RHEL-/compose/BaseOS//os/
```

Note the empty holes where `RHEL-10` and `x86_64` should be. The rcm-tools repo files in three Containerfiles used `COPY <<EOF` heredocs containing `$releasever` and `$basearch`. These are DNF runtime variables — they get resolved when `dnf` reads the repo file. But `COPY <<EOF` in a Containerfile treats `$` as a Dockerfile variable reference and expands them to empty strings before the file is even written.

The fix: switch from `COPY <<EOF` to `RUN cat <<'REPO'`. The single-quoted heredoc delimiter tells the shell not to expand variables, so `$basearch` survives as a literal for DNF to resolve at runtime. We hardcoded the OS version (`RHEL-10`, `RHEL-9`, `F-42`) since each Containerfile is already pinned to a specific base image anyway.

```dockerfile
# Before (broken):
COPY <<EOF /etc/yum.repos.d/rcm-tools.repo
[rcm-tools-rhel-baseos-rpms]
baseurl=https://internal-ftp/.../latest-RCMTOOLS-2-RHEL-$releasever/compose/BaseOS/$basearch/os/
EOF

# After (working):
RUN cat <<'REPO' > /etc/yum.repos.d/rcm-tools.repo
[rcm-tools-rhel-baseos-rpms]
baseurl=https://internal-ftp/.../latest-RCMTOOLS-2-RHEL-10/compose/BaseOS/$basearch/os/
REPO
```

Three files affected: `Containerfile.c10s`, `Containerfile.c9s`, `Containerfile.mcp`. Same bug, same fix, three times.

---

## Chapter 5: Can We Run This on OpenShift?

The local runner works, but it runs in a `--privileged` podman container. Could we run it on OpenShift for a permanent setup?

Short answer: no. OpenShift's restricted SCC (Security Context Constraint) doesn't allow the privileges that `buildah` needs. Even the `anyuid` SCC isn't enough — buildah needs to mount filesystems and manage namespaces. The options would be Kaniko (which doesn't need privileges but has its own limitations) or a dedicated VM. For now, the local runner is fine for development, and the shared GitLab runners handle production builds.

---

## Chapter 6: The Name Game

The pipeline built successfully. The push failed:

```
Error: authentication required
```

But login succeeded! The robot account was authenticated. The issue: **the quay.io repository names didn't match what CI was pushing to**.

| CI pushed to | Quay repo that existed |
|---|---|
| `jotnar/beeai-agent` | `jotnar/beeai` |
| `jotnar/mcp` | `jotnar/mcp-server` |

The robot account had write access to the *existing* repos, but CI was trying to push to repos that didn't exist yet. Buildah's error message — "authentication required" — was misleading. It wasn't an auth problem; it was a 404 dressed up as a 401.

We aligned the CI image tags with the existing quay.io repo names, updated the OpenShift ImageStreams to match, and the first successful push went through — supervisor leading the way.

---

## Epilogue: CI Done

```
$ buildah push $IMAGE_TAG
Getting image source signatures
Copying blob sha256:...
Writing manifest to image destination
```

One pipeline, seven images, three variable expansion bugs, two naming mismatches, and one runner setup odyssey. The images now build automatically on every merge request and push to main. The deployment repo is separate from the application code, and the whole thing is reproducible.

---

## Chapter 7: The ReadWriteOnce Deadlock

With the CI pipeline shipping fresh images, it was time to redeploy. The apply went through cleanly. Then `oc get pods` showed something puzzling:

```
phoenix-5bf9dd58d4-2n2v6             0/1     ContainerCreating   0          13m
phoenix-6d64c6f979-nmvgb             1/1     Running             0          8d
valkey-654df9599b-k4qcs              0/1     ContainerCreating   0          5d17h
valkey-6d85df8f49-s28zc              1/1     Running             0          5d17h
```

Both `phoenix` and `valkey` had two pods — the old one still Running, the new one stuck in `ContainerCreating` indefinitely. With `RollingUpdate`, Kubernetes starts the new pod before killing the old one. Both of these services use `ReadWriteOnce` PVCs — a storage access mode that only allows one pod to mount the volume at a time. The new pod can't mount the volume because the old pod still holds it. The old pod won't be terminated because the new pod is never Ready. A perfect deadlock.

The fix is `Recreate` strategy: Kubernetes kills all old pods first, waits for volumes to be released, then starts new pods. There's a brief window of downtime — but with `ReadWriteOnce` storage, that downtime was already baked in. `RollingUpdate` wasn't avoiding it; it was turning it into an indefinite hang.

```yaml
strategy:
  type: Recreate
```

One line. `Recreate` takes no parameters — no `rollingUpdate` block needed.

The lesson: `RollingUpdate` is the right default for stateless services, but any deployment that owns a `ReadWriteOnce` PVC needs `Recreate`. Kubernetes won't warn you; it'll just hang.

---

## Chapter 8: The Init Container Trick

Redis commander worked, but every pod startup produced this:

```
Problem saving connection config.
[Error: EACCES: permission denied, open
  '/usr/local/lib/node_modules/redis-commander/config/local-production.json']
```

OpenShift runs containers as non-root. The `node_modules` directory inside the image is root-owned. Redis commander uses `node-config` to persist connection settings and tries to write `local-production.json` into the package's own `config/` directory at startup. The filesystem says no.

The obvious fix — mount an `emptyDir` over the config directory — would shadow all the default config files redis-commander ships with. What we needed was a writable *copy* of those files.

Enter init containers. An init container runs to completion before the main container starts and can share volumes with it:

1. Init container mounts an `emptyDir` at `/config`
2. Init container copies the existing config directory into it
3. Main container mounts the same volume at the original path — now writable and pre-populated

```yaml
initContainers:
- name: copy-config
  image: redis-commander:prod
  command: ["sh", "-c", "cp -r /usr/local/lib/node_modules/redis-commander/config/. /config/"]
  volumeMounts:
  - name: config
    mountPath: /config
containers:
- name: redis-commander
  volumeMounts:
  - name: config
    mountPath: /usr/local/lib/node_modules/redis-commander/config
volumes:
- name: config
  emptyDir: {}
```

After redeployment, the error was gone. `oc logs` confirmed it: `Defaulted container "redis-commander" out of: redis-commander, copy-config (init)` — the init container had run, exited, and the main container took over.

There was one more puzzling line in the new logs:

```
setUpConnection (R:valkey:6379:0) Redis error Error: connect ECONNREFUSED 172.31.135.184:6379
...
Redis Connection valkey:6379 using Redis DB #0
found 1 keys for "" on node 0 (valkey:6379)
```

An error followed immediately by success. Redis-commander starts and immediately tries to connect to valkey. On that first attempt, valkey's pod isn't ready yet — either it just started or it's still terminating (thanks to the `Recreate` change landing at the same time). Redis-commander retries, valkey is up, the connection succeeds. A transient startup race, nothing more.

---

## Chapter 9: Rebuild Agents and an EC2 Ghost

The rebuild agent deployment files existed — `deployment-rebuild-agent-c9s.yml` and `deployment-rebuild-agent-c10s.yml` — but weren't wired into `deploy.sh`. Two `apply` calls added alongside the other BeeAI agents closed that gap.

While aligning the files with the backport pattern, a `nodeSelector` appeared in both rebuild deployments:

```yaml
nodeSelector:
  kubernetes.io/hostname: ip-10-30-34-89.us-east-1.compute.internal
```

An EC2 private IP hostname — a leftover from when all agents were pinned to a single node on the old AWS cluster (the `ReadWriteMany` chapter from Part 1). That node doesn't exist on the GPC cluster. Kubernetes would have accepted the deployment and then silently left the pods in `Pending` forever, waiting for a node that will never appear.

This is the same class of invisible landmine we cleaned up for the backport and rebase deployments during the initial migration. Any deployment that migrated from AWS is worth scanning for `kubernetes.io/hostname` selectors pointing at `ip-*` addresses.

---

## Epilogue (Part 1)

The stack is fully deployed: valkey, phoenix, redis-commander, the MCP gateway, the triage agent, backport, rebase, and rebuild agents for both c9s and c10s. Images build automatically on the GitLab CI pipeline. Deployments no longer hang on volume conflicts. Init containers handle the writable-config problem cleanly.

What's left: turning off `DRY_RUN` and letting the agents loose.

---

## Chapter 10: The Quota Deadlock

The agents were let loose. The GitLab CI pipeline rebuilt the images. Time to redeploy with a batch of changes — keytab migration, new bot identity, additional tooling. `deploy.sh` ran. Then:

```
NAME                                  READY   STATUS             RESTARTS   AGE
triage-agent-996c4569d-k2lkt          0/1     ErrImagePull       0          3m
mcp-gateway-5fdcf68b7-hbrkn           0/1     ImagePullBackOff   0          3m
```

The error was `manifest unknown` — the image SHA the pods were trying to pull no longer existed in quay.io. The CI pipeline had rebuilt the images and pushed new SHAs; the old ones were gone. Meanwhile, the ImageStreams had been updated to the new SHAs, and the deployments had new ReplicaSets with the correct images. But the old pods were still there, failing.

This is expected during a rolling update. The new ReplicaSets should create new pods, the new pods should become Ready, and then the old pods should be terminated. Except:

```
Warning  FailedCreate  replicaset-controller  Error creating: pods "triage-agent-7f798d86d9-9fd2q"
  is forbidden: exceeded quota: jotnar-ymir--notterminating,
  requested: limits.memory=1Gi,requests.memory=1Gi,
  used: limits.memory=7680Mi,requests.memory=6Gi,
  limited: limits.memory=8Gi,requests.memory=6Gi
```

The namespace has a `notterminating` resource quota — it counts all pods that are not in a Terminating state. `ImagePullBackOff` pods are not terminating. They're broken and useless, but they're alive, and they count.

The deadlock:

1. Old pods are stuck in `ImagePullBackOff`, consuming quota
2. New pods can't be created — quota is exhausted
3. RollingUpdate won't kill old pods until new pods are Ready
4. New pods can never become Ready because they can't even be created

Chapter 7 taught us that `RollingUpdate` deadlocks against `ReadWriteOnce` PVCs. This is the same pattern with a different trigger. The quota doesn't care why a pod is failing; it just sees a pod.

The fix was to extend `Recreate` to all remaining deployments — not just the ones with PVCs, but everything. With `replicas=1`, `RollingUpdate` never made sense anyway: there's no traffic to keep alive during a rollout, no gradual canary, no real benefit. It just adds risk. `Recreate` terminates the old pod first, freeing quota (and volumes, and whatever else), then starts the new one.

```yaml
strategy:
  type: Recreate
```

Ten files, ten identical changes. After `deploy.sh` ran again, all eleven pods came up cleanly.

The general lesson: with `replicas=1` and a tight namespace quota, `RollingUpdate` is downtime with extra steps and occasional deadlocks. `Recreate` is honest about the brief outage and never gets stuck.

---

## Chapter 11: The Build Arg That Looked Empty

While preparing the images, there was a confusing moment:

```
STEP 4/22: ARG INTERNAL_REPO_URL=""
--> 36a0d11d1310
STEP 5/22: RUN if [ -n "$INTERNAL_REPO_URL" ]; then \
      curl -fsSL -o /etc/yum.repos.d/internal.repo "$INTERNAL_REPO_URL"; \
    fi
--> a23d0a08f054
```

The build was invoked with `--build-arg INTERNAL_REPO_URL=$INTERNAL_REPO_URL_MCP`. The shell variable was set — `echo $INTERNAL_REPO_URL_MCP` produced the full URL. But the build output showed `ARG INTERNAL_REPO_URL=""`, which looked like the argument hadn't been passed.

It had been passed. `ARG INTERNAL_REPO_URL=""` is just how podman prints the `ARG` instruction from the Containerfile — it echoes the declaration with its default value, regardless of what `--build-arg` provided. The resolved value is used in subsequent `RUN` steps but never printed. STEP 5's curl ran with the real URL; it just did so silently (thanks to `-s`).

The display is accurate about the instruction text. It is not accurate about the runtime value. A more useful output would show `ARG INTERNAL_REPO_URL="https://..."` — but it doesn't, and the gap between what's printed and what's true is just wide enough to send you down the wrong path.

---

## Epilogue (Part 2)

All eleven pods running. Recreate strategy across the board. First triage run queued and processing. The quota deadlock is now a known failure mode rather than a mystery, and the ARG display quirk is documented so the next debugging session starts one step further along.
