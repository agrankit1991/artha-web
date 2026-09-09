# Build the SPA, then ship only the static output.
#
# Node exists at build time and nowhere near the running host: the runtime
# stage is a static file server, so the deployed container carries no
# JavaScript runtime and no npm dependency tree.

# ---- build ----------------------------------------------------------------
FROM node:24-alpine AS build

WORKDIR /build

# Dependencies install before the source is copied so the layer cache
# survives ordinary code changes.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Type checking runs as part of `build`, so a type error fails the image
# build rather than shipping.
RUN npm run build

# ---- runtime --------------------------------------------------------------
FROM caddy:2-alpine AS runtime

COPY --from=build /build/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 80
