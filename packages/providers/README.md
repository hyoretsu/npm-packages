## A collection of useful providers for Nest.js

- **`hashProviders`**

A simple provider to generate and compare hashes.

You need environment variables to use it.
> - `HASH_PROVIDER = "bcrypt"`

- **`mailProviders`**

A simple provider to send emails using Nodemailer.

You need environment variables to use it.
> - `MAIL_PROVIDER = "ethereal" | "gmail" | "nodemailer`
>
> If using Gmail/Nodemailer:
> - `MAIL_PASS`
> - `MAIL_USER`
>
> If using Nodemailer:
> - `MAIL_HOST`
> - `MAIL_PORT`
