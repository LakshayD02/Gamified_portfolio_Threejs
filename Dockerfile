FROM nginx:latest

# Set working directory
WORKDIR /usr/share/nginx/html

# Copy all files (make sure your project directory has all necessary files)
COPY . .

# Fix permissions
RUN chmod -R 755 /usr/share/nginx/html

# Create a simple health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
