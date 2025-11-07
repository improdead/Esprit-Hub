FROM node:20-alpine as base
WORKDIR /app

FROM base as deps
COPY package.json package-lock.json* ./
RUN npm ci || npm install

FROM deps as build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine as runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY data ./data
EXPOSE 3001
CMD ["node", "dist/index.js"]
