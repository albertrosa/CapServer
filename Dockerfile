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

# Copy the current directory contents into the container at /app
COPY . /app

# Install any necessary dependencies
RUN npm install
RUN npm install @solana/spl-token @solana/web3.js

# Make port 3000 available to the world outside this container
EXPOSE 3000
EXPOSE 8080
EXPOSE 80

# Set environment variables
ENV NODE_ENV=production

# Create a startup script that can handle both interactive and non-interactive modes
RUN echo '#!/bin/bash\n\
if [ "$1" = "shell" ]; then\n\
    exec /bin/bash\n\
elif [ "$1" = "test" ]; then\n\
    exec npm test\n\
elif [ "$1" = "dev" ]; then\n\
    exec npm run dev\n\
else\n\
    exec node app.js\n\
fi' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

# Use the startup script as the entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]

# Default command to start the node.js process
CMD ["node", "app.js"]

