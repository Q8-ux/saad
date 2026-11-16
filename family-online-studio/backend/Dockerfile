FROM node:22-alpine

LABEL org.opencontainers.image.source="https://github.com/Q8-ux/saad"
LABEL org.opencontainers.image.description="Arabic Writing Studio authentication and project gateway"

WORKDIR /app

COPY --chown=node:node server.mjs credentials.mjs sms-auth.mjs ./

ENV NODE_ENV=production
EXPOSE 10000

USER node

CMD ["node", "server.mjs"]
