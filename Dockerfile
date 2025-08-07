FROM node:20

# Set the working directory to /app
WORKDIR /app

# Install bash and other useful tools for interactive use
RUN apt-get update && apt-get install -y \
    bash \
    curl \
    git \
    vim \
    nano \
    && rm -rf /var/lib/apt/lists/*

# Copy package.json and package-lock.json first for better caching
COPY package*.json ./

# Clean install dependencies (including dev dependencies for linting)
RUN npm install

# Copy the rest of the application
COPY . /app

# Make port 3000 available to the world outside this container
EXPOSE 3000
EXPOSE 8080
EXPOSE 80

# Set environment variables
ENV NODE_ENV=production

# Copy the entrypoint script
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Use the startup script as the entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]

# Default command to start the node.js process
CMD ["node", "app.js"]
