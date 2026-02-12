# Runtime Info

## Docker Development Setup

### Files

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build: compiles TypeScript, then copies to n8n image |
| `docker-compose.yml` | Production mode - builds everything in Docker |
| `docker-compose.dev.yml` | Dev mode - mounts local `dist/` for faster iteration |
| `.dockerignore` | Excludes unnecessary files from Docker build |

### Usage

**Option 1: Full Docker Build** (builds code inside container)
```bash
pnpm run docker:build   # Build image
pnpm run docker:up      # Start n8n
```

**Option 2: Development Mode** (faster iteration)
```bash
pnpm install            # First time only
pnpm run docker:dev     # Builds locally + starts n8n with mounted dist/

# After making code changes:
pnpm run docker:dev:restart   # Rebuilds + restarts container
```

**Other commands:**
```bash
pnpm run docker:logs    # View n8n logs
pnpm run docker:down    # Stop container
```

### Access

n8n is available at **http://localhost:5678**

### Recommended Workflow

The dev mode is recommended for active development since it's faster - you just rebuild locally and restart the container instead of rebuilding the entire Docker image.

1. Run `pnpm install` once to install dependencies
2. Run `pnpm run docker:dev` to start n8n with your node
3. Make code changes
4. Run `pnpm run docker:dev:restart` to see changes
5. Repeat steps 3-4
