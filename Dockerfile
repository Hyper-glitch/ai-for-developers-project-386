FROM node:24.22.2-bookworm-slim AS frontend
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.13.18-slim-bookworm
WORKDIR /srv
COPY --from=ghcr.io/astral-sh/uv:0.13.7 /uv /usr/local/bin/uv
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --locked --no-dev --no-cache
COPY backend/app ./app
COPY --from=frontend /frontend/dist ./public
ENV PORT=8000
USER 65532:65532
EXPOSE 8000
CMD ["sh", "-c", "exec .venv/bin/uvicorn app.production:app --host 0.0.0.0 --port \"$PORT\" --workers 1"]
