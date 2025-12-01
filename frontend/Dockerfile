# ==============================
# Stage 1: Build do frontend Vite
# ==============================
FROM node:18-alpine AS build

WORKDIR /app

# Copiar package.json e package-lock.json da pasta gemini-wrapper
COPY gemini-wrapper/package.json gemini-wrapper/package-lock.json ./

# Instalar dependências usando o lockfile correto
RUN npm ci

# Copiar o restante do código do frontend
COPY gemini-wrapper ./ 

# Build de produção
RUN npm run build

# ==============================
# Stage 2: Servir com Nginx
# ==============================
FROM nginx:alpine

# Copiar build do React (Vite) para o Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# AGORA VAI USAR O SEU nginx.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
