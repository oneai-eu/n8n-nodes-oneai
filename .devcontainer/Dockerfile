FROM node:25-bookworm

# install base packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    openssh-client
RUN npm install -g pnpm
ENV NODE_OPTIONS=--max_old_space_size=4096

USER node