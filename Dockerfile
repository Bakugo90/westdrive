FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache dumb-init

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json ./
COPY docker/api/entrypoint.sh ./docker/api/entrypoint.sh
RUN chmod +x /app/docker/api/entrypoint.sh

USER node
EXPOSE 3000
ENTRYPOINT ["dumb-init", "--", "/app/docker/api/entrypoint.sh"]
CMD ["node", "dist/main.js"]
