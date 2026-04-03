FROM alpine:3.20

# Sloppy agent: fast but cuts corners, partial output
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
