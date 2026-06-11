FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
# VITE_* vars are baked into the bundle at build time — they must be passed as
# build args (e.g. `--build-arg VITE_SUPABASE_URL=...`) or the SPA ships without
# Supabase config and renders a blank page.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev
COPY backend/ .
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

RUN mkdir -p /data && \
    addgroup -S appgroup && adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /app /data

USER appuser

ENV NODE_ENV=production
ENV DB_PATH=/data/meal-planner.db
ENV PORT=3710

EXPOSE 3710

# Probe the unauthenticated /api/health route; container is unhealthy if it stops responding.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3710/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "server.js"]
