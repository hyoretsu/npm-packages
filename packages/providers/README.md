## A collection of useful backend providers

If you're using `tsyringe`, be sure to use `container.registerInstance()` instead of `container.registerSingleton()` and to instantiate the classes using `new Class()` for providers that have constructors.

- **`hashProviders`**

A simple provider to generate and compare hashes.

You need environment variables to use it.
> - `HASH_DRIVER = "bcrypt"`

- **`mailProviders`**

A simple provider to send emails using Nodemailer. Has constructor.

You need environment variables to use it.
> - `MAIL_DRIVER = "ethereal" | "gmail" | "nodemailer" | "sendgrid"`
>
> If using Gmail/Nodemailer:
> - `MAIL_PASS`
> - `MAIL_USER`
>
> If using Nodemailer:
> - `MAIL_HOST`
> - `MAIL_PORT`
>
> If using Sendgrid:
> - `SENDGRID_API_KEY`
