# TODO - Local Run Test Fixes

## Step 1: Fix docker-compose.yml warning
- Remove obsolete `version` attribute from docker-compose.yml.

## Step 2: Sort out Alpine/Docker image issues for frontend
- Verify Dockerfile uses Next standalone output correctly.
- Ensure required runtime artifacts (server.js) exist in runner image.
- If needed, adjust frontend Dockerfile to copy correct files.

## Step 3: Re-run docker-compose
- Run: `docker-compose up --build`
- Confirm backend health: `http://localhost:8000/health`
- Confirm frontend loads: `http://localhost:3000/`

## Step 4: If still failing, capture logs
- Collect: `docker-compose logs backend` and `docker-compose logs frontend`.

