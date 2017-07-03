+++
date = "2017-07-03T15:31:49+02:00"
draft = false
title = "Ansible Container usage"
tags = ["ansible", "ansible-container", "containers"]

+++

[Greg](https://twitter.com/gregdek) told me at AnsibleFest that we don't know how many users Ansible Container has. PyPI no longer directly provides information about downloads. Except... I recently stumbled upon [this blog post](https://relativity.fi/blog/analyzing-pypi-download-statistics-from-zero-to-half-a-million-downloads-in-9-months) which talks about getting download stats for PyPI packages using Google BigQuery. So let's do that!

<!--more-->

We need to execute a BigQuery SQL-like query. Let's do one [from the blog post mentioned above](https://relativity.fi/blog/analyzing-pypi-download-statistics-from-zero-to-half-a-million-downloads-in-9-months/) which shows daily downloads. Here's how you can run the query yourself:

1. Just open the [Google BigQuery service](https://bigquery.cloud.google.com/).
2. Enter this query:

    ```sql
    SELECT  
      STRFTIME_UTC_USEC(timestamp, "%Y-%m-%d") AS yyyymmdd,
      COUNT(*) as total_downloads,
    FROM  
      TABLE_DATE_RANGE(
        [the-psf:pypi.downloads],
        DATE_ADD(CURRENT_TIMESTAMP(), -300, "day"),
        DATE_ADD(CURRENT_TIMESTAMP(), -1, "day")
      )
    WHERE  
      file.project = 'ansible-container'
    GROUP BY  
      yyyymmdd
    ORDER BY  
      yyyymmdd DESC
    ```
3. And just run it.

You can even export it into spreadsheets afterwards. I did that and annotated the chart a bit:

![Ansible Container Usage](/img/ansible-container-usage.png)

As you can see, the new release usually creates a spike. On the other hand, there is a bunch of other spikes, I assume usually caused by someone talking or writing about Ansible Container.

Overall, more and more people seem to be using Ansible Container. Can't wait for `1.0`.


Here's some more links related to download stats:

 * [A bunch of helpful queries.](https://langui.sh/2016/12/09/data-driven-decisions/)
 * [Using plotly to create charts from the query.](http://moderndata.plot.ly/analyzing-plotlys-python-package-downloads/)
 * [CLI tool to view download stats.](https://github.com/ofek/pypinfo)
