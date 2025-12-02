FROM node:22-alpine

WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm ci --production --silent

# Copy app source (migrations & server code)
COPY . .

EXPOSE 5000

# Start the server
CMD ["node", "index.js"]
