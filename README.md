# aws-ses-v2-local

Docker image for [aws-ses-v2-local](https://github.com/domdomegg/aws-ses-v2-local) — a local Amazon SES mock server for development and testing.

Published to GHCR so you can pull a pre-built image instead of building from source in every project.

## Versioning

The Docker image version tracks the upstream npm package version.

For example, `ghcr.io/bylocico/aws-ses-v2-local:2.10.1` contains `aws-ses-v2-local@2.10.1`.

A scheduled workflow checks npm daily for new releases, builds and smoke-tests each one, and opens an auto-merge PR that retargets the image to the latest passing version.

## Usage

```bash
docker pull ghcr.io/bylocico/aws-ses-v2-local:2.10.1
docker run -p 8005:8005 ghcr.io/bylocico/aws-ses-v2-local:2.10.1
```

### Docker Compose

```yaml
services:
  ses-local:
    image: ghcr.io/bylocico/aws-ses-v2-local:2.10.1
    ports:
      - "${SES_LOCAL_PORT:-8005}:8005"
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:8005"]
      interval: 5s
      timeout: 5s
      retries: 5
      start_period: 10s
```

### Custom port

```yaml
services:
  ses-local:
    image: ghcr.io/bylocico/aws-ses-v2-local:2.10.1
    environment:
      - PORT=9000
    ports:
      - "9000:9000"
```

### Custom host binding

```yaml
services:
  ses-local:
    image: ghcr.io/bylocico/aws-ses-v2-local:2.10.1
    environment:
      - HOST=::
      - PORT=8005
    ports:
      - "8005:8005"
```

## Configuration

| Environment Variable | Default   | Description                         |
|---------------------|-----------|-------------------------------------|
| `PORT`              | `8005`    | Port the SES mock server listens on |
| `HOST`              | `0.0.0.0` | Host/address to bind to            |

Extra arguments can be appended after the image name and are passed through to the `aws-ses-v2-local` CLI.

## Email viewer

The server includes a built-in web UI at `http://localhost:<PORT>` for viewing captured emails.

The store API is available at `http://localhost:<PORT>/store`.

## AWS SDK configuration

Point your AWS SES client at the local server:

```typescript
import { SESv2Client } from '@aws-sdk/client-sesv2'

const ses = new SESv2Client({
  endpoint: 'http://localhost:8005',
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test',
  },
})
```

## Development

Build locally:

```bash
docker build -t aws-ses-v2-local .
docker run -p 8005:8005 aws-ses-v2-local
```

Build a specific upstream version:

```bash
docker build --build-arg SES_VERSION=2.8.0 -t aws-ses-v2-local:2.8.0 .
```

Check for newer upstream versions:

```bash
node scripts/update-version.mjs --list-newer
```

Retarget to a specific version:

```bash
node scripts/update-version.mjs --version 2.10.1
```

## Publishing

Publishing is handled by [`.github/workflows/publish.yml`](.github/workflows/publish.yml). It runs on **published GitHub Releases** and on **manual workflow dispatch**.

The workflow builds multi-arch images (`linux/amd64`, `linux/arm64`) and pushes to GHCR with version tags (`2.10.1`, `2.9`, `2`, `latest`).

### Release checklist

1. Confirm the npm version exists: `npm view aws-ses-v2-local@2.10.1 version`
2. Update `VERSION`, `Dockerfile`, and `README.md` (or run `node scripts/update-version.mjs --version X.Y.Z`)
3. Push to `main`
4. Create a GitHub Release with tag `v2.10.1`

## License

MIT
