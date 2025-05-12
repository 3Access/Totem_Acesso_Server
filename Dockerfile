# Use official Node 18 LTS image
FROM node:22-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json package-lock.json ./
RUN npm ci --production

# Bundle app source
COPY . .

# Expose the port your app listens on
EXPOSE 8085

# Run the application
CMD ["node", "index.js"]
