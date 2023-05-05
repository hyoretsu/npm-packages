## A collection of useful decorators for Nest.js

- IsOptional

How is this different from the default IsOptional? This one also checks for `undefined` and empty strings.

- Multipart

This is a decorator written for Fastify to easily upload files (while also validating fields just like `@Body()` with a depth of 1).

You need environment variables to use it.
> - `STORAGE_DRIVER = "local" | "s3"`
>
> If using Amazon S3:
> - `AWS_ACCESS_KEY_ID`
> - `AWS_BUCKET`
> - `AWS_SECRET_ACCESS_KEY`
> - `AWS_REGION`
