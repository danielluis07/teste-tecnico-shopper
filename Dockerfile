# Set the Node.js version as an ARG to allow flexibility during the build process.
ARG NODE_VERSION=18.18.0

# Use the official Node.js image with Alpine Linux for a lightweight build.
FROM node:${NODE_VERSION}-alpine

# Set the environment to production by default.
ENV NODE_ENV production

# Set the working directory inside the container.
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first to take advantage of Docker's layer caching.
COPY package*.json ./

# Install production dependencies.
RUN npm ci --omit=dev

# Copy the rest of the application code to the container.
COPY . .

# Create the uploads directory and ensure it is writable by the node user.
RUN mkdir -p /usr/src/app/src/uploads && chown -R node:node /usr/src/app/src/uploads

# Ensure the application runs as a non-root user for security.
USER node

# Expose the port that the application will listen on.
EXPOSE 8080

# Define the command to run the application.
CMD ["npm", "start"]
