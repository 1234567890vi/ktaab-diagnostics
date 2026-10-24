FROM node:24-alpine

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy application code
COPY . .

# Create volume for persistent SQLite database
VOLUME ["/app/data"]

ENV PORT=3000
ENV HOST=0.0.0.0

EXPOSE 3000

CMD ["node", "server.js"]
