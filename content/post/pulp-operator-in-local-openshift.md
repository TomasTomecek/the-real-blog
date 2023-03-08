---
title: "Running Pulp operator in a local OpenShift cluster"
date: 2023-02-27T15:00:00+01:00
draft: false
tags: [openshift, pulp]
---

Today I am running [Pulp](https://pulpproject.org/) in [Openshift local](https://developers.redhat.com/products/openshift-local/overview) using the [pulp-operator](https://docs.pulpproject.org/pulp_operator/).

These are the commands & notes so I can reproduce this in the future.

<!--more-->

## Openshift local

Spin up da cluster:

1. Go to https://console.redhat.com/openshift/create/local and download the CRC binary.

2. Unpack the archive, run the `crc` binary, and pray.

```
$ ./crc setup
CRC is constantly improving and we would like to know more about usage (more details at https://developers.redhat.com/article/tool-data-collection)
Your preference can be changed manually if desired using 'crc config set consent-telemetry <yes/no>'
Would you like to contribute anonymous usage statistics? [y/N]: y
Thanks for helping us! You can disable telemetry with the command 'crc config set consent-telemetry no'.
INFO Using bundle path /home/tt/.crc/cache/crc_libvirt_4.12.1_amd64.crcbundle
INFO Checking if running as non-root
INFO Checking if running inside WSL2
INFO Checking if crc-admin-helper executable is cached
INFO Caching crc-admin-helper executable
INFO Using root access: Changing ownership of /home/tt/.crc/bin/crc-admin-helper-linux

...

INFO Getting bundle for the CRC executable
INFO Downloading bundle: /home/tt/.crc/cache/crc_libvirt_4.12.1_amd64.crcbundle...
3.06 GiB / 3.06 GiB [-------------------------------] 100.00% 5.26 MiB p/s
INFO Uncompressing /home/tt/.crc/cache/crc_libvirt_4.12.1_amd64.crcbundle
crc.qcow2: 12.18 GiB / 12.18 GiB [------------------] 100.00%
oc: 124.65 MiB / 124.65 MiB [-----------------------] 100.00%
Your system is correctly setup for using CRC. Use 'crc start' to start the instance
```

neat

```
$ ./crc start
INFO Checking if running as non-root
INFO Checking if running inside WSL2
INFO Checking if crc-admin-helper executable is cached
INFO Checking if running on a supported CPU architecture
INFO Checking minimum RAM requirements

...

INFO Operators are stable (2/3)...
INFO Operators are stable (3/3)...
INFO Adding crc-admin and crc-developer contexts to kubeconfig...
Started the OpenShift cluster.

The server is accessible via web console at:
  https://console-openshift-console.apps-crc.testing

Log in as administrator:
  Username: kubeadmin
  Password: ...

Log in as user:
  Username: developer
  Password: developer

Use the 'oc' command line interface:
  $ eval $(crc oc-env)
  $ oc login -u developer https://api.crc.testing:6443
```

All of the above took about 20 minutes.

One note, there is no prometheus, so no monitoring & resources.


## Pulp operator

It's very well documented, just follow [https://docs.pulpproject.org/pulp_operator/install/install/](https://docs.pulpproject.org/pulp_operator/install/install/).

Both resources are needed: the OperatorGroup and the Subscription. Probably change namespace.

We can now request pulp:
```yaml
apiVersion: repo-manager.pulpproject.org/v1alpha1
kind: Pulp
metadata:
  name: pulp
  namespace: platform-stream
spec:
  api:
    replicas: 1
  content:
    replicas: 1
  worker:
    replicas: 1
  web:
    replicas: 1
```

I added web over the example in the docs. So we can access the web ui :)

We should expose the web out of the local cluster VM:
```
$ oc expose --port 8080 svc/pulp-web-svc
$ oc describe route pulp-web-svc
```

And we can now access the web interface:
```
$  curl -ksL http://pulp-web-svc-platform-stream.apps-crc.testing/pulp/api/v3/status | jq .
{
  "versions": [
    {
      "component": "core",
      "version": "3.22.0",
      "package": "pulpcore"
    },
    {
      "component": "rpm",
      "version": "3.18.9",
      "package": "pulp-rpm"
...
```

CRC can be unstable: the cluster just stopped responding. I am rebooting my CRC VM right now.
```
$ ./crc stop && ./crc start
```


## Starting with pulp

So we should now have a functional Pulp cluster. Let's use the pulp CLI guide now.

### https://pulpproject.org/pulp-in-one-container/#pulp-cli

We need to discover the admin secret:
```
$ oc get secret pulp-admin-password -oyaml
apiVersion: v1
data:
  password: ODYzN...=
kind: Secret
metadata:
  ...
type: Opaque
```

Decode it from base64:
```
$ echo 'ODYzN...=' | base64 -d
8635...m8
```

And configure the pulp CLI:
```
$ pulp config create --username admin --base-url http://pulp-api-svc-platform-stream.apps-crc.testing/ --password 8635...m8
Created config file at '/home/tt/.config/pulp/cli.toml'.
```

```
$ pulp status
{
  "versions": [
    {
      "component": "core",
      "version": "3.22.0",
      "package": "pulpcore"
    },
    {
      "component": "rpm",
      "version": "3.18.9",
      "package": "pulp-rpm"
    },
...
```

Question: what's the difference between api and web? web seems to serve api too

### https://docs.pulpproject.org/pulp_cli/quickstart/

TODO :)

