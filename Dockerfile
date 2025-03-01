FROM node:22-bookworm as builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
COPY ./src ./src
RUN npm install --only=production
RUN npm install --only=development typescript
RUN npm run build

FROM gcr.io/distroless/nodejs22-debian12
ENV NODE_ENV production
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
USER nonroot
EXPOSE 8080
CMD [ "dist/index.js" ]