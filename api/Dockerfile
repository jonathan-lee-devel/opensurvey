# syntax=docker/dockerfile:1
# Builds the NestJS API. Node 26 is the version CI runs on; the node:26 images
# no longer bundle Yarn, so each stage that installs pins Yarn 1 to match the
# repository's lockfile.

FROM node:26-alpine AS base
WORKDIR /app
RUN npm install -g yarn@1.22.22 --force

# All dependencies, for the compiler.
FROM base AS build
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN yarn build

# Runtime dependencies only.
FROM base AS prod-deps
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production && yarn cache clean

FROM node:26-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# DatabaseModule applies these SQL migrations on startup; it resolves the folder
# relative to dist/, so it must sit next to it exactly as in the source tree.
COPY drizzle ./drizzle
COPY package.json ./
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
