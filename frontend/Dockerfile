# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
# We use VITE_API_URL to point to the backend in production
RUN npm run build

# Run Stage
FROM nginx:alpine
# Copy built assets to Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration if needed (e.g. for SPA routing)
# RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
