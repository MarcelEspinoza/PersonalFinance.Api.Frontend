# -------------------------------
# Stage 1: Build con Node.js
# -------------------------------
FROM node:20 AS build
WORKDIR /app

# Copiamos package.json y package-lock.json
COPY package*.json ./

# Instalamos dependencias de forma limpia
RUN npm ci

# Copiamos el resto del código fuente
COPY . .

# 🚨 Definimos la URL de backend para Vite
RUN echo "VITE_API_URL=https://personalfinanceapibackend-production.up.railway.app/api" > .env.production

# Ejecutamos build de Vite
RUN npx vite build

# -------------------------------
# Stage 2: Servir con Nginx
# -------------------------------
FROM nginx:alpine

# Copiamos la configuración de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiamos archivos compilados de la build
COPY --from=build /app/dist /usr/share/nginx/html

# Ajustamos permisos (Nginx se ejecuta como usuario 'nginx')
RUN chown -R nginx:nginx /usr/share/nginx/html

# Exponemos puerto 80
EXPOSE 80

# Comando de inicio
CMD nginx -g "daemon off;"
