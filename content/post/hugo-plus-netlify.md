+++
tags = ["blog"]
date = "2015-10-01T00:00:00+02:00"
title = "hugo + netlify = ❤"

+++

So I migrated my blog to [hugo](https://gohugo.io/) and am hosting it on [netlify](https://netlify.com/).

All I can say is...

<!--more-->

**Wow!!**

It's so much fun to

 * write blogposts in markdown in vim
 * publish with `git push`
 * not to bother with databases, code, admin interfaces
 * serve your blog in milliseconds

## Was it hard to setup?

Nope.

Learning hugo is very straightforward. Just check out [the quickstart guide](http://gohugo.io/overview/quickstart/). You'll have a blog up in an half an hour. And on top of it, there is plenty of [themes](https://github.com/spf13/hugoThemes/) available.

Host your blog source on GitHub or BitBucket. Configure themes as submodules properly:

```
$ git submodule add https://github.com/digitalcraftsman/hugo-steam-theme themes/hugo-steam-theme
```

### netlify deployment

Log in to netlify, connect your repo and enter these values:

```text
Build Cmd: hugo
Public folder: public
```

For more info, see [this blog post](https://www.netlify.com/blog/2015/07/30/hugo-on-netlify-insanely-fast-deploys) from netlify blog.


And that's it. Enjoy!
