#!/bin/bash

# Start Ollama the background
ollama serve &
pid=$!

echo "Waiting for Ollama to start..."
while ! ollama list > /dev/null 2>&1; do
  sleep 1
done

echo "Ollama started. Checking for qwen2.5-coder:7b..."

# Pull model if not exists (ollama pull skips if already present with sha match, but we can be explicit)
ollama pull qwen2.5-coder:7b

echo "Model qwen2.5-coder:7b is ready!"

# Wait for the background process to exit (it won't, unless crashed)
wait $pid
