# moauth

Minimal OAuth 2.0 authorization server

[![Built with Astro](https://astro.badg.es/v2/built-with-astro/tiny.svg)](https://astro.build)

## Disclaimer
This project is not a production-ready authorization server, rather a prototype built as a part of a graduation thesis _"Selecting OAuth 2.0 Authorization Server for Applications with Microservices Architecture: Architectural Considerations and Practical Evaluation"_ in TalTech University. Please note that this repository will not get any updates and is archived!

## Run
1. Clone `git clone`
1. Push schema and seed database (see [Configuration/Database](#database))
1. Configure your clients (see [Configuration/Clients](#clients))
1. Build and run `docker compose up -d`
1. Open `http://localhost:3210`
1. Ready!

## OAuth 2.0 Standards
Now **moauth** implements/follows:
- [The OAuth2 Authentication Framework (RFC6749)](https://datatracker.ietf.org/doc/html/rfc6749)
- [The OAuth2 Bearer Token (RFC6750)](https://datatracker.ietf.org/doc/html/rfc6750)
- [Proof Key for Code Exchange by OAuth Public Clients (RFC7636)](https://datatracker.ietf.org/doc/html/rfc7636)
- [JSON Web Token (JWT) Profile for OAuth 2.0 Access Tokens (RFC9068)](https://datatracker.ietf.org/doc/html/rfc9068)
- [Best Current Practice for OAuth 2.0 Security (RFC9700)](https://datatracker.ietf.org/doc/html/rfc9700)

## Configuration
### Database
You need to push database schema and optionally seed database before you start!

1. Install dependencies `pnpm install`
1. Run `docker compose up db -d`
1. Push schema to `http://localhost:8080`:
```
ASTRO_DB_REMOTE_URL=http://localhost:8080 pnpm --filter @moauth/identity astro db push
```
1. [Optional] Seed database:
```
ASTRO_DB_REMOTE_URL=http://localhost:8080 pnpm --filter @moauth/identity astro db execute db/seed.ts --remote
```

This will add a single user:
```
Email:      pamayo@taltech.ee
Password:   Pass1234!
```

### Clients
You can register client in `apps/identity/src/oauth/clients.ts`:
```typescript
const clients: Client[] = [
  // add your client here!
]
```

#### Client Secret
Clients without secret (i.e. `secretHash: null`) are public clients

To add confidential client:
1. Generate 32 random bytes from secure source
1. Encode random bytes with **hex uppercase** - that's your secret!
1. Hash secret using SHA-256
1. Encode hashed bytes using **hex lowercase** - that's your `secretHash`!

#### Client ID
It's [`cuid2`](https://github.com/paralleldrive/cuid2)

You can generate one with
```
cuid
# prints: nnqq8p0utwlb37769z9xt0gc
```

## Security
Project is archived and doesn't accept new issues/pull requests. However, security vulnerabilities can be reported to author directly at mayorov.eestpavel@gmail.com. All security vulnerabilities will be promptly addressed and made public.

## License
GNU Affero General Public License v3.0
