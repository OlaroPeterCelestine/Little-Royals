# syntax=docker/dockerfile:1
# Little Royals desk (Vue/Vite) → static nginx

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html vite.config.ts tsconfig.json postcss.config.js tailwind.config.js ./
COPY public ./public
COPY src ./src

ARG VITE_USE_API=true
ARG VITE_API_BASE_URL=http://127.0.0.1:18080
ARG VITE_WS_URL=ws://127.0.0.1:18080
ARG VITE_APP_NAME=Little Royals Desk
ARG VITE_APP_ENV=production

ENV VITE_USE_API=$VITE_USE_API \
    VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_WS_URL=$VITE_WS_URL \
    VITE_APP_NAME=$VITE_APP_NAME \
    VITE_APP_ENV=$VITE_APP_ENV

RUN npm run build

FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
CMD ["nginx", "-g", "daemon off;"]
