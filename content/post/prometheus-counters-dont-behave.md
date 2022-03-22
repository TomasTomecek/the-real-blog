---
title: "Prometheus counters don't behave"
date: 2022-22-03T08:00:00+01:00
draft: false
tags: ["prometheus", "grafana"]
---

...when the numbers are not increasing consistently.


## The problem

We have moved from `httpd` + `mod_wsgi` to [launch Packit's API server with
`mod_wsgi-express`](http://blog.dscpl.com.au/2015/04/introducing-modwsgi-express.html).
That change [simplified](https://github.com/packit/packit-service/pull/1363)
how we run Packit - look at the number of removed lines! But sadly it broke [a
Grafana](https://grafana.com/) chart I used almost daily. The chart shows an
amount of traffic from GitHub webhooks Packit processes.

This chart is wrong because it should display "current load", instead of these
constantly increasing lines which reset at some point:

![Incorrect chart for amount of processed traffic](/img/metrics-issue.png)

Suddenly we have this chart which doesn't tell us anything meaningful.


## Analysis

There are a few things to understand in order to resolve the problem. I learnt
all of these while researching :)

* [Prometheus
  counters](https://prometheus.io/docs/concepts/metric_types/#counter) are
  meant to *only* increase or reset if the process restarts.

  Hold on, but that's happening in the chart above, so... Why it's wrong?

* [Grafana
  `increase()`](https://prometheus.io/docs/prometheus/latest/querying/functions/#increase)
  function should be used to visualize the data since it shows a difference
  between measurements and hence shows the load.

  Well, we used it before changing the webserver and it worked as expected. So
  what change broke the chart?

* The `increase()` function can deal with the resets to 0. Except that based on
  the chart above it seems it cannot.

* Finally (and most importantly), we have [a `/metrics`
  endpoint](https://github.com/packit/packit-service/blob/1294d9e362db12ca164ff71dbc69b1cb05a5b9f7/packit_service/service/app.py#L52)
  in Packit which provides numbers for Prometheus used for the chart above. The
  data is stored in the Python WSGI process, the numbers are **not** in any
  database: they are just regular Python variables defined using the [python
  prometheus](https://github.com/prometheus/client_python) client library. They
  are in mercy of Python, WSGI, Linux and OpenShift.

[Please read here, in the original GitHub issue
comment](https://github.com/packit/packit-service/issues/1391#issuecomment-1066561455),
the complete analysis of the problem with real examples.

###

This is just a quick blog post, so here's the actual bug:

**TL;DR** the `/metrics` endpoint is served by multiple httpd processes which
have different numbers and they confuse the `increase()` function because the
numbers are no longer monotonically increasing.

## Resolution

\o/

![Incorrect chart for amount of processed traffic](/img/prod-total-webhook-metric.png)

I resolved this by [applying
labels](https://prometheus.io/docs/practices/naming/#labels) to different
measurements (process ID in this case) and aggregate them with the `sum()`
function. You can see the updated query in the chart above, [here's a
corresponding PR](https://github.com/packit/packit-service/pull/1400).
Grafana's not public.

Happy measuring!

