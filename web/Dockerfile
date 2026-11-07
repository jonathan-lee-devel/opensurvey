# syntax=docker/dockerfile:1
# Builds the Angular app with Node 26 (the version CI runs on) and serves the
# static bundle with nginx, which also proxies /api/ to the API container; see
# nginx.conf. The node:26 images no longer bundle Yarn, so it is pinned to match
# the repository's lockfile.

FROM node:26-alpine AS build
WORKDIR /app
RUN npm install -g yarn@1.22.22 --force
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY angular.json tsconfig.json tsconfig.app.json ./
COPY public ./public
COPY src ./src
# CI=true keeps the Angular CLI from prompting or printing progress bars.
RUN CI=true yarn build

FROM nginx:1.29-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/web/browser /usr/share/nginx/html
EXPOSE 80
