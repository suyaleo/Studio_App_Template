# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS web-builder
WORKDIR /build/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM python:3.12-slim AS runtime
ARG APP_VERSION=0.1.0
ARG VCS_REF=unknown
LABEL org.opencontainers.image.title="Studio App Template" \
      org.opencontainers.image.description="Leo Studio web and Docker application starter" \
      org.opencontainers.image.source="https://github.com/suyaleo/Studio_App_Template" \
      org.opencontainers.image.revision="$VCS_REF" \
      org.opencontainers.image.version="$APP_VERSION" \
      org.opencontainers.image.licenses="Apache-2.0"

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    APP_PORT=8080 \
    DATA_DIR=/data \
    STATIC_DIR=/app/web-dist

WORKDIR /app
COPY api/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt \
    && groupadd --system studio \
    && useradd --system --gid studio --home-dir /app studio \
    && mkdir -p /data /app/web-dist \
    && chown -R studio:studio /data /app

COPY --chown=studio:studio api/ /app/api/
COPY --chown=studio:studio studio.json /app/studio.json
COPY --chown=studio:studio --from=web-builder /build/web/dist/ /app/web-dist/

USER studio
VOLUME ["/data"]
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import os, urllib.request; urllib.request.urlopen('http://127.0.0.1:' + os.getenv('APP_PORT', '8080') + '/api/health', timeout=3)"

CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${APP_PORT:-8080}"]
