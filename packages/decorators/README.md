## A collection of useful decorators (mainly Nest.js)

- **`IsOptional()`**

How is this different from the default IsOptional? This one also checks for `undefined` and empty strings.

- **`Multipart()`**

This is a decorator written for Nest.js with `FastifyAdapter` to easily upload files (while also validating fields just like `@Body()` with a depth of 1). Requires `@fastify/multipart` to be setup prior to using it.

You need environment variables to use it.
> - `STORAGE_DRIVER = "local" | "s3"`
>
> If using disk storage:
> - `UPLOAD_FOLDER`
>
> If using Amazon S3:
> - `AWS_ACCESS_KEY_ID`
> - `AWS_BUCKET`
> - `AWS_SECRET_ACCESS_KEY`
> - `AWS_REGION`


- **`QueryRequired()`**

This is just like the default `@Query()` decorator from Nest.js, but it throws an error if the parameter is not present.
