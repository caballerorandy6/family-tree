FROM node:22-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Set working directory
WORKDIR /app

# Copy root package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy all packages
COPY packages ./packages

# Copy the api app
COPY apps/api ./apps/api

# Install all dependencies (including devDependencies for tsx)
RUN pnpm install --frozen-lockfile

# Generate Prisma client
RUN pnpm --filter @familytree/database generate

# Build shared packages (types, validations, database)
RUN pnpm turbo build --filter=@familytree/types --filter=@familytree/validations --filter=@familytree/database

# Expose port
EXPOSE 4000

# Set environment
ENV NODE_ENV=production
ENV PORT=4000

# Start the server with tsx (runs TypeScript directly)
CMD ["pnpm", "--filter", "api", "exec", "tsx", "src/index.ts"]
