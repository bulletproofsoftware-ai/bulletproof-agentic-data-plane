FROM node:20-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc

FROM node:20-slim AS api
WORKDIR /app
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist/ ./dist/
COPY src/db/migrations/ ./dist/db/migrations/
EXPOSE 8099
CMD ["node", "dist/index.js"]

FROM node:20-slim AS dashboard-build
WORKDIR /app
COPY src/dashboard/package.json ./
RUN npm install
COPY src/dashboard/ ./
ARG VITE_DEFAULT_TOKEN=""
ENV VITE_DEFAULT_TOKEN=$VITE_DEFAULT_TOKEN
RUN npm run build

FROM nginx:alpine AS dashboard
COPY --from=dashboard-build /app/dist /usr/share/nginx/html
RUN printf 'server { listen 8100; root /usr/share/nginx/html; index index.html; \
location /api { proxy_pass http://host.docker.internal:8099; proxy_set_header Host $host; } \
location / { try_files $uri /index.html; } \
}\n' > /etc/nginx/conf.d/default.conf
EXPOSE 8100
CMD ["nginx", "-g", "daemon off;"]
