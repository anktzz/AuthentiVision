# Stage 1: Build the React frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend

# Install dependencies first for caching
COPY frontend/package*.json ./
RUN npm install

# Copy source and build
COPY frontend/ ./
RUN npm run build

# Stage 2: Package the FastAPI backend and serve
FROM python:3.11-slim

# Create a non-root user (UID 1000 required by Hugging Face Spaces)
RUN useradd -m -u 1000 user
WORKDIR /app

# Install system utilities (git is required for some pip installations or tracking)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install backend dependencies
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r backend/requirements.txt && \
    pip install --no-cache-dir --no-deps facenet-pytorch==2.6.0

# Copy backend files
COPY backend ./backend

# Copy built frontend assets from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Set ownership of the application directory to the non-root user
RUN chown -R user:user /app

# Switch to non-root user
USER user
WORKDIR /app/backend

# Expose the default port expected by Hugging Face Spaces
EXPOSE 7860

# Serve the FastAPI application using uvicorn on port 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
