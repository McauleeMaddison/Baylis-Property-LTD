FROM node:18-alpine AS deps
WORKDIR /app

# Install only API dependencies (lives inside /server)
COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy installed node_modules from deps stage
COPY --from=deps /app/server/node_modules ./server/node_modules

# Copy application source (frontend + backend)
COPY . .

EXPOSE 5000
CMD ["npm", "run", "start", "--prefix", "server"]
