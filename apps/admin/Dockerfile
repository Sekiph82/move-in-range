FROM node:22-alpine

WORKDIR /app
COPY package.json package-lock.json ./
COPY tsconfig.base.json tsconfig.base.json
COPY apps/admin/package.json apps/admin/package.json
COPY packages packages
RUN npm ci --workspace @moveinrange/admin --include-workspace-root
COPY apps/admin apps/admin
WORKDIR /app/apps/admin
ENV PORT=3200
RUN npm run build
EXPOSE 3200
CMD ["npm", "run", "start"]
