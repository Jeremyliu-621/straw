FROM alpine:3.20

# Good agent: reads input carefully, produces well-structured output
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
