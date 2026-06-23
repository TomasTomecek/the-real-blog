---
title: "Running opencode inside openshell on Fedora 44 with llama-cpp"
date: "2026-06-23T20:00:00+02:00"
draft: false
tags: ["AI", "Agents", "Fedora", "Podman"]
---

For quite some time I wanted to explore
[openshell](https://github.com/NVIDIA/OpenShell). I naively thought it would be
easy to set up on my workstation that has an AMD GPU, together with llama-cpp
as an inference server.

After following the tutorial, I was immediately stuck even with running the gateway in a podman container.

I guess I'm too old for this stuff because I let Claude Code to investigate the problems.

<img src="/img/flower-jun2026.JPG" style="width: 800px;">

<!--more-->

---

*The rest of this post is written by [Claude](https://claude.ai/), Anthropic's
AI assistant. Tomas pointed me at his Fedora 44 box over SSH and asked me to
get [opencode](https://opencode.ai/) running inside an
[openshell](https://github.com/NVIDIA/OpenShell) sandbox with local
[llama.cpp](https://github.com/ggerganov/llama.cpp) inference. What follows is
what I found, what broke, and how I fixed it.*

---

## What I was working with

Tomas gave me SSH access to a machine called `cacao`. Fedora 44, rootless
Podman, SELinux enforcing, AMD Radeon RX 7800 XT (16 GB VRAM). The goal:
opencode running inside an openshell sandbox, talking to a local Qwen3.5-9B
model through llama.cpp. Fully local inference, no cloud APIs.

I had the OpenShell source repository on Tomas's workstation, so I loaded up the
`debug-openshell-cluster` skill and started poking.

## The gateway was dead

First thing I ran:

```
$ openshell status
Error:   × client error (Connect)
  ├─▶ tcp connect error
  ╰─▶ Connection refused (os error 111)
```

The gateway container had exited cleanly 21 hours ago. So had the sandbox. I
pulled the gateway logs and found this repeating every minute:

```
WARN openshell_server::compute: Sandbox failed to become ready
  sandbox_name=national-mammal reason=ContainerExited Container exited with code 1
```

The sandbox logs told the other half of the story:

```
Error: × Policy fetch failed after 5 attempts: failed to connect to OpenShell server
```

Sandboxes couldn't reach the gateway. Time to figure out why.

## Seven problems, one `podman run`

I ended up fixing seven separate issues before the first sandbox came up
healthy. I'll spare you the full debugging narrative (it's all in
[issue #1909](https://github.com/NVIDIA/OpenShell/issues/1909)) and give you
the working result.

### Problem 1: port binding

The gateway was started with `-p 127.0.0.1:8080:8080`. Sandboxes live on the
`openshell` bridge network (10.89.x.0/24) and reach the host through
`host.containers.internal`, which resolves to the bridge gateway IP (10.89.1.1),
not loopback. Nothing was listening on 10.89.1.1:8080.

Fix: `-p 0.0.0.0:8080:8080`.

### Problem 2: UID mapping

The gateway image runs as UID 1000:1000. In rootless Podman, container UID 1000
maps to host UID ~100999 via subuid. That UID can't access the Podman socket,
which is owned by `tt` (host UID 1000).

Fix: `--userns=keep-id`, which keeps container UID 1000 as host UID 1000.

### Problem 3: SELinux

Even with the right UID, I got "Permission denied" on the Podman socket. No
obvious reason until I checked the audit log:

```
AVC avc: denied { write } for comm="openshell-gatew" name="podman.sock"
  scontext=system_u:system_r:container_t:s0:c487,c938
  tcontext=unconfined_u:object_r:user_tmp_t:s0 tclass=sock_file permissive=0
```

`container_t` can't write to `user_tmp_t` sockets. Classic Fedora SELinux
interaction.

Fix: `--security-opt label=disable` for the gateway container.

### Problem 4: volume ownership

After adding `--userns=keep-id`, the existing SQLite database (created by a
previous container without `keep-id`) was owned by host UID 100999. The gateway
couldn't open it.

Fix: `podman unshare chown -R 0:0` on the volume data (maps container root to
host UID 1000, which is the actual owner).

### Problem 5: missing sandbox JWT

The sandbox supervisor needs a JWT token to authenticate with the gateway. No
JWT signing keys were configured, so the supervisor had no token source:

```
Error: × Policy fetch failed after 5 attempts: no sandbox token source available
```

Fix: generate an Ed25519 key pair, write a TOML config with
`[openshell.gateway.gateway_jwt]`, and mount both into the container.

### Problem 6: CLI authentication

With JWT configured, the gateway now rejected unauthenticated CLI requests:

```
Error: × status: Unauthenticated, message: "missing authorization header"
```

Fix: add `[openshell.gateway.auth] allow_unauthenticated_users = true` to the
TOML. Fine for a single-user local setup.

### Problem 7: state directory path mismatch

This was the trickiest one. The gateway writes sandbox JWT token files to a path
inside its container, then tells the Podman API (which runs on the host) to
bind-mount that same path into the sandbox. But the host doesn't have that
path.

```
Error: × podman API error (500): statfs .../sandbox.jwt: no such file or directory
```

Fix: use a mirrored bind mount where the host path equals the container path,
and set `XDG_STATE_HOME` to point there. I used
`/run/user/1000/openshell-state` on both sides.

### The working command

Here's what I arrived at:

```
$ mkdir -p /run/user/1000/openshell-state

$ podman run -d --name openshell-gateway \
  --userns=keep-id \
  --security-opt label=disable \
  -p 0.0.0.0:8080:8080 \
  -v openshell-state:/var/openshell \
  -v /run/user/1000/podman/podman.sock:/var/run/podman.sock \
  -v ~/.config/openshell/jwt:/etc/openshell/jwt:ro \
  -v ~/.config/openshell/gateway.toml:/etc/openshell/gateway.toml:ro \
  -v /run/user/1000/openshell-state:/run/user/1000/openshell-state \
  -e OPENSHELL_DRIVERS=podman \
  -e OPENSHELL_PODMAN_SOCKET=/var/run/podman.sock \
  -e OPENSHELL_DB_URL=sqlite:/var/openshell/openshell.db \
  -e OPENSHELL_DISABLE_TLS=true \
  -e OPENSHELL_GATEWAY_CONFIG=/etc/openshell/gateway.toml \
  -e XDG_STATE_HOME=/run/user/1000/openshell-state \
  ghcr.io/nvidia/openshell/gateway:latest \
  --log-level debug --bind-address 0.0.0.0 --port 8080
```

Every flag earned its place the hard way.

One caveat: `/run/user/1000/openshell-state` lives on tmpfs. After a reboot you
need to `mkdir -p` it again before starting the container.

The TOML config and JWT keys need to exist on the host first. Here's how to
generate them:

```
$ mkdir -p ~/.config/openshell/jwt
$ openssl genpkey -algorithm ed25519 -out ~/.config/openshell/jwt/signing.pem
$ openssl pkey -in ~/.config/openshell/jwt/signing.pem -pubout \
    -out ~/.config/openshell/jwt/public.pem
$ uuidgen > ~/.config/openshell/jwt/kid

$ cat > ~/.config/openshell/gateway.toml << 'EOF'
[openshell.gateway.auth]
allow_unauthenticated_users = true

[openshell.gateway.gateway_jwt]
signing_key_path = "/etc/openshell/jwt/signing.pem"
public_key_path  = "/etc/openshell/jwt/public.pem"
kid_path         = "/etc/openshell/jwt/kid"
gateway_id       = "openshell"
EOF
```

## Setting up the llama.cpp server

Tomas already had this configured as a systemd user service. I just needed to
start it:

```
$ systemctl --user start llama-server
$ systemctl --user status llama-server
● llama-server.service - llama.cpp inference server (Qwen3.5-9B)
     Active: active (running)
```

The service runs llama-server on `0.0.0.0:8888` with a Qwen3.5-9B Q4_K_M model
loaded onto the RX 7800 XT. The `0.0.0.0` binding is important because
sandboxes reach the host through `host.containers.internal`, not loopback.

Quick sanity check:

```
$ curl -s http://127.0.0.1:8888/v1/models | python3 -m json.tool | head -5
{
    "models": [
        {
            "name": "Qwen3.5-9B-Q4_K_M.gguf",
            "model": "Qwen3.5-9B-Q4_K_M.gguf",
```

## Wiring up inference routing

OpenShell has a privacy router that lets sandboxes call `https://inference.local`
without needing API keys or direct network access to the inference backend. I
needed to tell the gateway to route those requests to the local llama.cpp
server.

```
$ openshell provider create \
    --name local-llama \
    --type openai \
    --credential OPENAI_API_KEY=none \
    --config OPENAI_BASE_URL=http://host.openshell.internal:8888/v1

$ openshell inference set \
    --provider local-llama \
    --model Qwen3.5-9B-Q4_K_M.gguf \
    --no-verify
```

The `--no-verify` flag is needed because the gateway itself can't resolve
`host.openshell.internal`. That hostname only works inside sandbox containers.
The credential is `none` because llama.cpp doesn't require auth.

## Configuring opencode

Opencode is pre-installed in the base openshell sandbox image. It needs a config
file telling it to use `inference.local` as its backend. I created this on the
host:

```
$ mkdir -p ~/.config/opencode
$ cat > ~/.config/opencode/config.json << 'EOF'
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "local": {
      "name": "Local Llama",
      "api": "openai",
      "options": {
        "baseURL": "https://inference.local/v1"
      },
      "models": {
        "Qwen3.5-9B-Q4_K_M.gguf": {
          "name": "Qwen3.5-9B",
          "attachment": false
        }
      }
    }
  },
  "model": "local/Qwen3.5-9B-Q4_K_M.gguf"
}
EOF
```

The `baseURL` points to `https://inference.local/v1`, not directly to
llama.cpp. The privacy router handles the forwarding.

## Creating the sandbox

The config file lives on the host. I used `--upload` to place it inside the
sandbox at creation time:

```
$ openshell sandbox create --name my-sandbox \
    --upload ~/.config/opencode/config.json:/sandbox/.config/opencode/config.json \
    -- true
```

Two things I learned here. The sandbox user is `sandbox` with home at
`/sandbox`, so the config path is `/sandbox/.config/opencode/config.json`, not
`/root/.config/...` (I tried that first and got "Permission denied").

The `-- true` at the end matters. Without a command, `sandbox create` opens an
interactive shell and blocks forever. Passing `true` lets the creation finish
immediately while keeping the sandbox alive.

Verification:

```
$ openshell sandbox exec --name my-sandbox -- opencode models local
local/Qwen3.5-9B-Q4_K_M.gguf
```

I also tested the inference path directly from inside the sandbox:

```
$ openshell sandbox exec --name my-sandbox -- \
    curl -s https://inference.local/v1/chat/completions \
    -H "Content-Type: application/json" \
    -d '{"model":"Qwen3.5-9B-Q4_K_M.gguf","messages":[{"role":"user","content":"Say hello"}],"max_tokens":20}'
{"choices":[{"message":{"role":"assistant","content":"Hello! ..."}}], ...}
```

The request path: opencode -> `inference.local` (privacy router inside the
sandbox) -> openshell gateway -> `host.openshell.internal:8888` -> llama.cpp on
the host.

## Running opencode

```
$ openshell sandbox exec --tty --name my-sandbox
sandbox$ opencode
```

The `--tty` flag is essential for TUI applications. Without it, the sandbox
exec session gets `TERM=dumb` and no PTY, which makes opencode's terminal UI
completely unreadable.

## Wrapping up

The gateway setup on Fedora with rootless Podman and SELinux was genuinely
difficult. Seven issues, each one hidden behind the previous one. But once the
gateway was healthy, the inference routing through `inference.local` was pretty
elegant. No API keys inside the sandbox, no direct network access to the
inference server, and the gateway hot-reloads when you change providers.

I filed [issue #1909](https://github.com/NVIDIA/OpenShell/issues/1909) upstream
with the full diagnostic trace. Hopefully future users won't need to discover
all seven problems one at a time.
