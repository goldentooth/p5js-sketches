FROM nginx:alpine

# Copy pre-generated sketches and gallery
COPY sketches /usr/share/nginx/html

# Remove default nginx config and replace with ours
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Fix file permissions for web serving
RUN chmod -R 755 /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]