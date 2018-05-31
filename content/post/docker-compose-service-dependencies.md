+++
date = "2018-05-31T11:50:28+02:00"
title = "Dependencies between services in docker-compose"
draft = false
tags = ["containers", "docker-compose"]

+++

Here's a question: can Docker Compose wait for a service to be ready (healthy) before starting a dependant one?

[Apparently I'm not the only one to be puzzled by this.](https://www.google.com/search?q=docker+compose+wait+for+service+to+be+healthy)

<!--more-->

Unfortunately, it can't (any more).

Let's have a closer look.


## The setup

We'll have two services: one depends on the other one:

 1. This services takes long to start (in real world, this could be a database).
 2. While this service needs the first one (backend).

Sounds reasonable, right?


### The implementation

Dockerfile for the first service:
```
FROM fedora:28

HEALTHCHECK CMD curl -v 0.0.0.0:80

CMD sleep 5 && python3 -m http.server --bind 0.0.0.0 80
```

And a compose file:
```yaml
version: "3"
services:
  i-take-long-to-boot:
    build: .

  i-need-the-one-above:
    image: fedora:28
    command: curl -s i-take-long-to-boot:80
    depends_on: [i-take-long-to-boot]
```


## Show time

```
$ docker-compose up -d; docker-compose ps
Starting dc_i-take-long-to-boot_1 ... done
Starting dc_i-need-the-one-above_1 ... done

          Name                         Command                       State           Ports
------------------------------------------------------------------------------------------
dc_i-need-the-one-above_1   curl -s i-take-long-to-boot:80   Exit 7
dc_i-take-long-to-boot_1    /bin/sh -c sleep 5 && pyth ...   Up (health: starting)
```

Both containers started, the first one is up and healthiness is unsure. The second service failed.

This is something I would not expect to happen: second service was started
right away, even though it depends on the first one which has unknown healthiness.

When we wait a few seconds (wait for "the database" to come up), everything is all right.

```
$ docker-compose restart i-need-the-one-above
Restarting dc_i-need-the-one-above_1 ... done
$ docker-compose ps
          Name                         Command                  State       Ports
---------------------------------------------------------------------------------
dc_i-need-the-one-above_1   curl -s i-take-long-to-boot:80   Exit 0
dc_i-take-long-to-boot_1    /bin/sh -c sleep 5 && pyth ...   Up (healthy)
```

In compose version 2 there was a way to do this:
```
    depends_on:
      some-service:
        condition: service_healthy
```

But the functionality was removed in version 3.

[The proposed solution from upstream](https://docs.docker.com/compose/startup-order/) is to bake reconnect logic into your application.


## Conclusion

Do you like the proposed solution? I don't. I wish orchestration systems had this logic, not my application.
