import http from "node:http";
import { Server } from "socket.io";
import app from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase } from "./config/database.js";
import { initSockets } from "./sockets/index.js";
import { startWorkers } from "./jobs/queues.js";
import { logger } from "./utils/logger.js";

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: env.corsOrigins.includes("*") ? "*" : env.corsOrigins, credentials: true },
});

initSockets(io);

const start = async () => {
  try {
    await connectDatabase();
    startWorkers();
    server.listen(env.port, env.host, () => {
      logger.info(`Server running at http://${env.host}:${env.port}/`);
    });
  } catch (error) {
    logger.error("Failed to start server", { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

process.on("unhandledRejection", (error) => logger.error("Unhandled rejection", { error }));
process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", { error });
  process.exit(1);
});

start();

export { server, io };
