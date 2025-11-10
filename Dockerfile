# Stage 1 - build
FROM node:18 AS build
WORKDIR /app

ENV VITE_API_URL=https://personalfinance-api-backend.onrender.com/api

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2 - nginx
FROM nginx:alpine

# Copia configuración personalizada de nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia build output
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]