FROM node:18 AS build
WORKDIR /app

ENV VITE_API_URL=https://personalfinance-api-backend.onrender.com/api

COPY . .
RUN npm install && npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
