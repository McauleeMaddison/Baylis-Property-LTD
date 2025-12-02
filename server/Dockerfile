FROM node:18-alpine

WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm ci --production --silent

# Copy app source
COPY . .

EXPOSE 5000

CMD ["node", "index.js"]
