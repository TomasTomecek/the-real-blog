+++
date = "2016-05-17T12:20:46+02:00"
draft = true
title = "Simple way to check for race conditions"

+++

Today was a fun day. We were working on a piece of code which interacts with PostgreSQL database. One function was reading from database and based on the query result it inserted some data afterwards. The thing is that it wasn't done in a transaction so I suspected there could be a race condition. But how to test such case?

My requirements for such test were obvious: I wanna spam the server with streams of requests and check logs if the server is able to handle it. Pretty easy to do in shell:

```
for y in `seq 1 8` ; \
    do (for x in `seq 1 50` ; \
        do curl -s url/api/v1/endpoint/ ; \
    done)& ; \
done
```

This simple shell script spawns 8 processes in parallel where each process performs 50 requests sequentially.

I hit the race condition immediately.

\o/

