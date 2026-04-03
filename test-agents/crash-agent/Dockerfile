FROM alpine:3.20

# Crash agent: exits with non-zero code to test failure handling
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
