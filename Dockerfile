# Use Node.js 18 (LTS)
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies (production only, but we need devDependencies for build currently if we build inside, wait)
# Vite build needs devDependecies.
RUN npm install

# Copy source code
COPY . .

# Build the Frontend
RUN npm run build

# Prune dev dependencies to save space (optional, skipping for simplicity)
# RUN npm prune --production

# Expose port (Internal container port)
EXPOSE 3001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Command to run the app
CMD ["node", "server/index.js"]
