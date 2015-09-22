+++
tags = ["postgresql"]
date = "2015-03-15T00:00:00+02:00"
title = "Fuzzy text search with trigrams in postgresql"

+++

Using postgres for fuzzy searches.

We'll try to match arbitrary beer names to ones in our DB. Let's create table first:

<!--more-->

```
postgres=# \l
List of databases
   Name    |  Owner   | Encoding |   Collate   |    Ctype    |   Access privileges
-----------+----------+----------+-------------+-------------+-----------------------
 db        | postgres | UTF8     | en_US.UTF-8 | en_US.UTF-8 | =Tc/postgres         +
           |          |          |             |             | postgres=CTc/postgres+
           |          |          |             |             | pg=CTc/postgres

postgres=# \connect db

db=# create table test (brewery varchar(255), name varchar(255), cleaned varchar(255));
```

Is the _test_ really there?

```
db=# \d test
Table "public.test"
 Column  |          Type          | Modifiers
---------+------------------------+-----------
 brewery | character varying(255) |
 name    | character varying(255) |
 cleaned | character varying(255) |
```

Let's add some sample data:

```
db=# insert into test values ('Matuska', 'Raptor', 'matuska raptor'), ('Matuska', 'Zlatá Raketa', 'matuska zlata raketa'), ('Matuska', 'Černá Raketa', 'matuska cerna raketa'), ('Matuska', 'California', 'matuska california');
INSERT 0 4

db=# select * from test;
 brewery |     name     |       cleaned
---------+--------------+----------------------
 Matuska | Raptor       | matuska raptor
 Matuska | Zlatá Raketa | matuska zlata raketa
 Matuska | Černá Raketa | matuska cerna raketa
 Matuska | California   | matuska california
(4 rows)
```

Search time!

```
db=# CREATE EXTENSION pg_trgm;

db=# select *, similarity(cleaned, 'zlata raketa matuska') as sim from test where cleaned % 'zlata raketa matuska' order by sim desc;
 brewery |     name     |       cleaned        |   sim
---------+--------------+----------------------+----------
 Matuska | Zlatá Raketa | matuska zlata raketa |        1
 Matuska | Černá Raketa | matuska cerna raketa | 0.576923
 Matuska | Raptor       | matuska raptor       |      0.4
(3 rows)

db=# select *, similarity(cleaned, 'raketa matuska') as sim from test where cleaned % 'raketa matuska' order by sim desc;
 brewery |     name     |       cleaned        |   sim
---------+--------------+----------------------+----------
 Matuska | Zlatá Raketa | matuska zlata raketa |     0.75
 Matuska | Černá Raketa | matuska cerna raketa | 0.714286
 Matuska | Raptor       | matuska raptor       |      0.5
 Matuska | California   | matuska california   | 0.307692
(4 rows)

db=# select *, similarity(cleaned, 'raketa') as sim from test where cleaned % 'raketa' order by sim desc;
 brewery |     name     |       cleaned        |   sim
---------+--------------+----------------------+----------
 Matuska | Zlatá Raketa | matuska zlata raketa |     0.35
 Matuska | Černá Raketa | matuska cerna raketa | 0.333333
(2 rows)
```

As you can see, it works pretty good. If you change word order, it finds correct match. Once not clear, it offers closest solution.

How about typos?

```
db=# select *, similarity(cleaned, 'zlta rketa') as sim from test order by sim desc;
 brewery |     name     |       cleaned        |    sim
---------+--------------+----------------------+-----------
 Matuska | Zlatá Raketa | matuska zlata raketa |      0.25
 Matuska | Černá Raketa | matuska cerna raketa |  0.148148
 Matuska | Raptor       | matuska raptor       | 0.0416667
 Matuska | California   | matuska california   |         0
(4 rows)
```
