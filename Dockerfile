# Stage 1 - Build: Utiliza un entorno Node.js para compilar la aplicación React/Vite.
FROM node:20 AS build
WORKDIR /app

# Argumento de build de Docker, pasado desde Cloud Build (VITE_API_URL).
ARG VITE_API_URL

# Establecer la variable de entorno para que esté disponible durante la ejecución de comandos.
ENV VITE_API_URL=$VITE_API_URL

# Instalar dependencias
COPY package*.json ./
# Utilizamos 'npm ci' para builds limpios y reproducibles
RUN npm ci

# Copiamos el código fuente restante
COPY . .

# 🚨 CORRECCIÓN CRÍTICA DE VITE:
# Inyectamos explícitamente la variable VITE_API_URL en el comando de build de npm.
# Esto garantiza que Vite la recoja y la use como 'import.meta.env.VITE_API_URL'.
# Sin esta línea, Vite puede usar el valor vacío, forzando a tu cliente a usar el fallback "/api".
RUN VITE_API_URL=${VITE_API_URL} npm run build

# Stage 2 - Serve with Nginx: Utilizamos una imagen ligera de Nginx para servir los archivos estáticos.
FROM nginx:alpine

# Copiamos la configuración de Nginx (debe estar configurada con 'listen 8080' y 'try_files').
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiamos los archivos estáticos compilados desde la etapa 'build' al directorio de Nginx.
COPY --from=build /app/dist /usr/share/nginx/html

# 🚨 CORRECCIÓN DE PERMISOS:
# Nginx se ejecuta como usuario 'nginx'. Los archivos copiados pueden tener permisos de 'root'.
# Esto asegura que el usuario 'nginx' tenga permisos de lectura, previniendo errores 404 por permisos.
RUN chown -R nginx:nginx /usr/share/nginx/html

# EXPOSE 8080: Cloud Run espera que la aplicación escuche en el puerto 8080.
EXPOSE 8080

# Comando de inicio: Muestra la configuración de Nginx y luego lo inicia en primer plano.
CMD cat /etc/nginx/conf.d/default.conf && nginx -g "daemon off;"