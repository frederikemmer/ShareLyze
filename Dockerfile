FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY backend ./backend
COPY frontend ./frontend
RUN npm run build

FROM node:24-bookworm-slim
ENV NODE_ENV=production BACKEND_HOST=0.0.0.0 BACKEND_PORT=3000 DB_PATH=/data/sharelyze.db FRONTEND_DIR=/app/dist/frontend
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends gosu && rm -rf /var/lib/apt/lists/*
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/backend ./backend
COPY --from=build --chown=node:node /app/dist ./dist
RUN mkdir -p /data && chown node:node /data
COPY --chmod=755 docker/entrypoint.sh /usr/local/bin/sharelyze-entrypoint
EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/sharelyze-entrypoint"]
CMD ["node", "--import", "tsx", "backend/src/server.ts"]
