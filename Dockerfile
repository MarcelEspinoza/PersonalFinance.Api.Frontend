# Stage 1 - build the Vite app using Node 20
FROM node:20 AS build
WORKDIR /app

ENV VITE_API_URL=https://personalfinance-api-backend.onrender.com/api

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2 - nginx to serve the static files
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]