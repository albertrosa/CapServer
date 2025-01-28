FROM node:14

# Set the working directory to /app
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . /app

# Install any necessary dependencies
RUN npm install

# Make port 3000 available to the world outside this container
EXPOSE 3000
EXPOSE 8080

# Run the command to start the node.js process
CMD ["node", "app.js"]

