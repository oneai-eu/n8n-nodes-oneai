# Build stage - compiles TypeScript
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.1.4 --activate

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Copy source files
COPY tsconfig.json gulpfile.js ./
COPY nodes/ ./nodes/
COPY credentials/ ./credentials/

# Build the node
RUN pnpm run build

# Runtime stage - n8n with custom node
FROM n8nio/n8n:latest

USER root

# Create custom nodes directory
RUN mkdir -p /home/node/.n8n/custom

# Copy built node from builder stage
COPY --from=builder /app/dist /home/node/.n8n/custom/n8n-nodes-oneai/dist
COPY --from=builder /app/package.json /home/node/.n8n/custom/n8n-nodes-oneai/

# Set ownership
RUN chown -R node:node /home/node/.n8n

USER node

# Set custom nodes path
ENV N8N_CUSTOM_EXTENSIONS="/home/node/.n8n/custom"

WORKDIR /home/node
