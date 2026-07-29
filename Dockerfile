FROM node:22-alpine AS build
WORKDIR /app

COPY package.json ./
COPY package-lock.json ./
COPY frontend/package.json frontend/package.json
COPY frontend/package-lock.json frontend/package-lock.json
COPY backend/package.json backend/package.json

RUN npm ci --include=optional

COPY . .
RUN npm run build --workspace frontend

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json ./
COPY package-lock.json ./
COPY frontend/package.json frontend/package.json
COPY frontend/package-lock.json frontend/package-lock.json
COPY backend/package.json backend/package.json

RUN npm ci --omit=dev --include=optional --workspace backend

COPY backend backend
COPY --from=build /app/frontend/dist frontend/dist

EXPOSE 3001
CMD ["npm", "run", "start", "--workspace", "backend"]
