FROM node:20-slim@sha256:2cf067cfed83d5ea958367df9f966191a942351a2df77d6f0193e162b5febfc0 AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc
USER node

FROM node:20-slim@sha256:2cf067cfed83d5ea958367df9f966191a942351a2df77d6f0193e162b5febfc0 AS api
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist/ ./dist/
COPY src/db/migrations/ ./dist/db/migrations/
RUN chown -R node:node /app
EXPOSE 8099
USER node
CMD ["node", "dist/index.js"]

FROM node:20-slim@sha256:2cf067cfed83d5ea958367df9f966191a942351a2df77d6f0193e162b5febfc0 AS dashboard-build
WORKDIR /app
COPY src/dashboard/package.json ./
RUN npm install
COPY src/dashboard/ ./
ARG VITE_DEFAULT_TOKEN=""
ENV VITE_DEFAULT_TOKEN=$VITE_DEFAULT_TOKEN
RUN npm run build
USER node

FROM nginx:alpine@sha256:4a73073bd557c65b759505da037898b61f1be6cbcc3c2c3aeac22d2a470c1752 AS dashboard
COPY --from=dashboard-build /app/dist /usr/share/nginx/html
RUN printf 'server { listen 8100; root /usr/share/nginx/html; index index.html; \
location /api { proxy_pass http://host.docker.internal:8099; proxy_set_header Host $host; } \
location / { try_files $uri /index.html; } \
}\n' > /etc/nginx/conf.d/default.conf \
  && chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx \
  && touch /tmp/nginx.pid && chown nginx:nginx /tmp/nginx.pid \
  && sed -i 's,pid  */var/run/nginx.pid;,pid /tmp/nginx.pid;,' /etc/nginx/nginx.conf \
  && sed -i '/^user  *nginx;/d' /etc/nginx/nginx.conf
EXPOSE 8100
USER nginx
CMD ["nginx", "-g", "daemon off;"]
