# ── Bazaar Backend — Dockerfile ──────────────────────────────────
# Used by Fly.io (and optionally Railway) to containerise the FastAPI app.

# Use the official slim Python image (smaller = faster deploys)
FROM python:3.11-slim

# Set working directory inside the container
WORKDIR /app

# Copy requirements first — Docker caches this layer.
# If only source code changes, pip install is NOT re-run (faster builds).
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend source
COPY . .

# Expose the port FastAPI will listen on
EXPOSE 8000

# Start the server
# --host 0.0.0.0  → listen on all network interfaces (required in containers)
# --port 8000     → must match EXPOSE above
# Remove --reload in production (it's for development only)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
