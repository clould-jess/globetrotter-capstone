FROM node:22-alpine AS builder

WORKDIR /app

# Install bash and coreutils (timeout) required by scripts/build-verified.sh
RUN apk add --no-cache bash coreutils

# Copy dependency manifests
COPY package.json package-lock.json ./
COPY .npmrc ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy application source code
COPY . .

# Ensure shell scripts have execute permissions
RUN chmod +x scripts/*.sh

# Build application
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built application and node_modules
COPY --from=builder /app ./

USER nextjs

EXPOSE 3000

CMD ["npm", "run", "start"]
