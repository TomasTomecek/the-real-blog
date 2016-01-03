+++
date = "2016-01-03T11:57:38+01:00"
draft = false
title = "Copy your private GPG key to a new machine"
tags = ["linux"]

+++

It's really simple to copy your private GPG keys to another machine of yours.

Let's do public key first:

```text
$ gpg --export --armor KEY | ssh me@my-other-machine 'gpg --import'
gpg: keyring `/home/me/.gnupg/secring.gpg' created
gpg: keyring `/home/me/.gnupg/pubring.gpg' created
gpg: /home/me/.gnupg/trustdb.gpg: trustdb created
gpg: key 4937B925: public key "KEY" imported
gpg: Total number processed: 1
gpg:               imported: 1  (RSA: 1)
```

It worked! Now the private:

```
$ gpg --export-secret-key --armor KEY | ssh me@my-other-machine 'gpg --import --allow-secret-key-import'
gpg: key 4937B925: secret key imported
gpg: key 4937B925: "KEY" not changed
gpg: Total number processed: 1
gpg:              unchanged: 1
gpg:       secret keys read: 1
gpg:   secret keys imported: 1
```

(`--armor` is optional, it's just for sake of checking the output first before piping it to `ssh`)
