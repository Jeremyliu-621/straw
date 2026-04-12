FROM node:20-slim

# Install Docker CLI (needed to run eval containers)
RUN apt-get update && apt-get install -y docker.io && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src/ src/
COPY tsconfig.json ./

RUN npm install -g tsx

CMD ["tsx", "src/workers/evaluation-worker.ts"]
