# bulletproof-agentic-data-plane

**A data plane for AI agents: classified, access-controlled, audited data over GraphQL + REST.**

`bulletproof-agentic-data-plane` is a TypeScript service that gives agents a governed
way to read and write data. It exposes GraphQL and REST APIs behind authentication,
rate limiting, and query timing, classifies data by sensitivity, and records lineage
and access to an audit bus.

## Features

- **GraphQL + REST** APIs over your data (`src/api/`).
- **Auth + rate limiting + query timing** middleware.
- **Data classification** — routes/records classify data by sensitivity.
- **Lineage + audit** — writes access/lineage events to an audit bus.

## Run it

```bash
npm install
cp .env.example .env      # set DB + JWT config
npm run build
npm start
```

Or via Docker (`Dockerfile` included). Configuration is env-driven — see
[`.env.example`](.env.example).

## Development

```bash
npm install
npm test          # jest
npm run typecheck
```

## License

Apache-2.0 © 2026 bulletproofsoftware-ai. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
