## A collection of useful backend providers

### Installation & drivers

Driver libraries are **optional peer dependencies** — install only what you use. The package no longer pulls every driver on install.

| Subpath | Drivers (install as needed) |
| --- | --- |
| `@hyoretsu/providers/cache` | `ioredis` |
| `@hyoretsu/providers/hash` | `bcrypt`, `bcryptjs` |
| `@hyoretsu/providers/jwt` | `jose`, `jsonwebtoken` |
| `@hyoretsu/providers/mail` | `nodemailer`, `nodemailer-sendgrid` |
| `@hyoretsu/providers/messaging` | `amqplib` (RabbitMQ), `kafkajs` |
| `@hyoretsu/providers/logging` | `pino`, `pino-loki`, `@opentelemetry/*` |

### Lazy registries (breaking change in v2)

Each registry entry is now a **lazy loader**: `Record<Key, () => Promise<ProviderClass>>`. Calling it dynamically imports the implementation — and therefore its driver — on demand. Only the driver you actually call is ever required, so installing a single driver from a provider's list is enough.

```ts
import { hashProviders, HashProvidersEnum } from "@hyoretsu/providers/hash";

const driver = (process.env.HASH_DRIVER ?? HashProvidersEnum.BCRYPTJS) as keyof typeof hashProviders;

const HashProvider = await hashProviders[driver](); // imports only that driver here
const hasher = new HashProvider();
```

Subpath imports load only that provider's code; the root `@hyoretsu/providers` barrel still re-exports everything for back-compat.

> **Migration from v1:** registry values changed from classes to `() => Promise<class>`. Replace `new hashProviders[driver]()` with `new (await hashProviders[driver]())()`.

If you're using `tsyringe`, be sure to use `container.registerInstance()` instead of `container.registerSingleton()` and to instantiate the classes using `new Class()` for providers that have constructors.

- **`hashProviders`**

A simple provider to generate and compare hashes.

You need environment variables to use it.
> `HASH_DRIVER = "bcrypt"`

- **`mailProviders`**

A simple provider to send emails using Nodemailer. Has constructor.

You need environment variables to use it.
> `MAIL_DRIVER = "ethereal" | "gmail" | "nodemailer" | "sendgrid"`
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
