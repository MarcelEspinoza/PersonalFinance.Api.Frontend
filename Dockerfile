# Stage 1 - Build: Utiliza un entorno Node.js para compilar la aplicación React/Vite.
FROM node:20 AS build
WORKDIR /app

# Argumento de build de Docker, pasado desde Cloud Build.
# Debe comenzar con "_" para ser reconocido por Cloud Build.
ARG _VITE_API_URL

# Instalar dependencias
COPY package*.json ./
# Utilizamos 'npm ci' para builds limpios y reproducibles
RUN npm ci

# Copiamos el código fuente restante
COPY . .

# 🚨 SOLUCIÓN DEFINITIVA: CREAR ARCHIVO .ENV
# Escribimos el valor del ARG de Docker (_VITE_API_URL) en el archivo .env.production, 
# usando el nombre que Vite espera (VITE_API_URL).
# COMENTARIO PARA ROMPER CACHE Y FORZAR RE-BUILD: v3
RUN echo "VITE_API_URL=${_VITE_API_URL}" > .env.production

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