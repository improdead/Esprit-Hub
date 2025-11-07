FROM node:20-alpine as base
WORKDIR /app

FROM base as deps
COPY package.json package-lock.json* ./
RUN npm ci || npm install

FROM deps as build
COPY tsconfig.json ./
COPY index.html ./
COPY src ./src
RUN npm run build

FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
