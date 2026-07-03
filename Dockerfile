# Use optimized, official lightweight Node.js Alpine base image
FROM node:20-alpine

# Set production environment
ENV NODE_ENV=production

# Set default working directory inside the container
WORKDIR /usr/src/app

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install only production dependencies securely and cleanly
RUN npm ci --only=production --silent

# Copy remaining source code
COPY --chown=node:node . .

# Use non-root node user for runtime security
USER node

# Expose port 3000
EXPOSE 3000

# Start command
CMD ["node", "server/index.js"]