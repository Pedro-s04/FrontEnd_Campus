# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build-time API base for production; defaults to nginx reverse proxy path.
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_EMAILJS_SERVICE_ID
ARG VITE_EMAILJS_TEMPLATE_ID
ARG VITE_EMAILJS_PUBLIC_KEY
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_EMAILJS_SERVICE_ID=${VITE_EMAILJS_SERVICE_ID}
ENV VITE_EMAILJS_TEMPLATE_ID=${VITE_EMAILJS_TEMPLATE_ID}
ENV VITE_EMAILJS_PUBLIC_KEY=${VITE_EMAILJS_PUBLIC_KEY}

RUN npm run build

FROM nginx:1.27-alpine AS production
WORKDIR /usr/share/nginx/html

RUN rm -rf ./*

COPY --from=build /app/dist .
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
