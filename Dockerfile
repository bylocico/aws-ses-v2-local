FROM node:26-alpine

ARG SES_VERSION
COPY VERSION /tmp/VERSION
RUN npm install -g aws-ses-v2-local@${SES_VERSION:-$(cat /tmp/VERSION)} && \
    npm cache clean --force && \
    rm -rf /tmp/npm-* /tmp/VERSION

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENV HOST=0.0.0.0
ENV PORT=8005

EXPOSE ${PORT}

HEALTHCHECK --interval=5s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --spider -q http://localhost:${PORT} || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
