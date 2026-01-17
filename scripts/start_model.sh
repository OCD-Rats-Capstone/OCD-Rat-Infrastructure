#!/bin/bash
# Script to start the Docker Model Runner with the correct model and port

# Default model, can be overridden by argument
MODEL_NAME=${1:-"huggingface.co/qwen/qwen2.5-coder-3b-instruct-gguf"}
# Docker Model Runner typically uses port 12434 by default
PORT=12434

echo "Starting Docker Model Runner..."
echo "Model: $MODEL_NAME"
echo "Note: The model will be available at http://localhost:12434/v1 or via http://model-runner.docker.internal/v1 inside containers"

# Check if docker command exists
if ! command -v docker &> /dev/null; then
    echo "Error: docker command not found."
    exit 1
fi

# Check for model runner support (rudimentary check)
if ! docker model --help &> /dev/null; then
    echo "Warning: 'docker model' command not found. Ensure you have Docker Desktop 4.40+ (Mac) or 4.41+ (Windows)."
fi

# Run the model in detached mode (background)
# Note: Docker Model Runner manages ports automatically (usually 12434 on host, or via http://model-runner.docker.internal in containers)
docker model run -d $MODEL_NAME
