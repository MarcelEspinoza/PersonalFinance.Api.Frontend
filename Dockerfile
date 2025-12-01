# Stage 1 - Build
FROM node:20 AS build
WORKDIR /app

# Variable de entorno dinámica para la URL del backend
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Instalar dependencias
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2 - Serve with Nginx
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
