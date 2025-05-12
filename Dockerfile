# syntax=docker/dockerfile:1

# 1. Base image
FROM node:18-alpine

# 2. Create app directory
WORKDIR /usr/src/app

# 3. Only copy package.json (and lockfile if present)
COPY package*.json ./

# 4. Install dependencies
RUN npm install --production

# 5. Copy the rest of your source
COPY . .

# 6. Expose your app’s port
EXPOSE 8085

# 7. Default start command
CMD ["node", "index.js"]
