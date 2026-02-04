FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Create uploads directory if it doesn't exist
RUN mkdir -p uploads/rooms

# Expose the port your Express app runs on (adjust if different)
EXPOSE 3130

# Start the application
CMD ["npm", "start"]