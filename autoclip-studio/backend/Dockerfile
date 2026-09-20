FROM node:24-alpine
WORKDIR /app
COPY --chown=node:node server.mjs ./
USER node
ENV PORT=8788
EXPOSE 8788
CMD ["node", "server.mjs"]
