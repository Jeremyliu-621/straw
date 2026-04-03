#!/bin/bash
# Build and optionally push all test agent Docker images
# Usage: ./build-all.sh [--push]

set -e

REGISTRY="${DOCKER_REGISTRY:-straw-test}"

for agent in good-agent okay-agent sloppy-agent crash-agent; do
  echo "Building ${agent}..."
  docker build -t "${REGISTRY}/${agent}:latest" "./${agent}"

  if [ "$1" = "--push" ]; then
    echo "Pushing ${REGISTRY}/${agent}:latest..."
    docker push "${REGISTRY}/${agent}:latest"
  fi
done

echo "All test agents built successfully."
echo ""
echo "Images:"
docker images | grep "${REGISTRY}" || true
