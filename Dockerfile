# Stage 1 - Build: Utiliza un entorno Node.js para compilar la aplicación React/Vite.
FROM node:20 AS build
WORKDIR /app

# NOTA IMPORTANTE: Se ha eliminado el ARG _VITE_API_URL.
# La variable de Cloud Build está llegando vacía, por lo que hardcodeamos la URL
# del servicio de backend para forzar la compilación correcta y resolver el error 405.

# Instalar dependencias
COPY package*.json ./
# Utilizamos 'npm ci' para builds limpios y reproducibles
RUN npm ci

# Copiamos el código fuente restante
COPY . .

# 🚨 SOLUCIÓN DEFINITIVA: CREAR ARCHIVO .ENV con URL HARDCODEADA
# Usamos la URL inferida de tu servicio de backend.
RUN echo "VITE_API_URL=https://personalfinance-api-backend-246552849554.europe-southwest1.run.app" > .env.production

# Ahora ejecutamos el build de Vite.
RUN npx vite build

# Stage 2 - Serve with Nginx: Utilizamos una imagen ligera de Nginx para servir los archivos estáticos.
FROM nginx:alpine

# Copiamos la configuración de Nginx (debe estar configurada con 'listen 8080' y 'try_files').
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiamos los archivos estáticos compilados desde la etapa 'build' al directorio de Nginx.
COPY --from=build /app/dist /usr/share/nginx/html

# 🚨 CORRECCIÓN DE PERMISOS:
# Nginx se ejecuta como usuario 'nginx'.
RUN chown -R nginx:nginx /usr/share/nginx/html

# EXPOSE 8080: Cloud Run espera que la aplicación escuche en el puerto 8080.
EXPOSE 8080

# Comando de inicio: Muestra la configuración de Nginx y luego lo inicia en primer plano.
CMD cat /etc/nginx/conf.d/default.conf && nginx -g "daemon off;"