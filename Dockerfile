FROM node:22-alpine AS build
WORKDIR /app

COPY package.json ./
COPY frontend/package.json frontend/package.json
COPY backend/package.json backend/package.json

RUN npm install

COPY . .
RUN npm run build --workspace frontend

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json ./
COPY frontend/package.json frontend/package.json
COPY backend/package.json backend/package.json

RUN npm install --omit=dev --workspace backend

COPY backend backend
COPY --from=build /app/frontend/dist frontend/dist

EXPOSE 3001
CMD ["npm", "run", "start", "--workspace", "backend"]
