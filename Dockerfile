FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for pgvector and Node.js for frontend build
RUN apt-get update && apt-get install -y \
    gcc \
    build-essential \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Build frontend
# Copy only package.json first (lock file removed for simple builds)
COPY frontend/package.json ./frontend/
RUN cd frontend && npm install

# Copy frontend source and build
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Verify the dist folder was created (fails fast if build breaks)
RUN test -d /app/frontend/dist && echo "Frontend dist built successfully" || (echo "ERROR: frontend/dist missing" && exit 1)

# Copy backend application code
COPY backend/ ./backend/

# Set environment variables
ENV PYTHONPATH=/app
ENV HOST=0.0.0.0
ENV PORT=8855

# Expose port
EXPOSE 8855

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:8855/health')" || exit 1

# Run the application — serves both API and built frontend static files
CMD ["python3", "-m", "uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "8855"]
