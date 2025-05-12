# syntax=docker/dockerfile:1

FROM node:18-alpine

# Install build tools for native modules
RUN apk add --no-cache \
      python3 \
      make \
      g++ 

WORKDIR /usr/src/app

# Copy only package manifests first, so we get better caching
COPY package*.json ./

# Install only production deps (with legacy-peer-deps if you need it)
RUN npm install --production --legacy-peer-deps

# Copy the rest of the app
COPY . .

EXPOSE 8085

CMD ["node", "index.js"]
