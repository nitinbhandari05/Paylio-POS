import dotenv from "dotenv";
import mongoose from "mongoose";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import { setSocketServer } from "./utils/realtime.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, "../../.env") });

const { default: app } = await import("./app.js");

const PORT = process.env.PORT || 3001;

const startServer = () => {
  const server = app.listen(PORT, "127.0.0.1", () => {
    console.log(`Server running at http://127.0.0.1:${PORT}/`);
  });

  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  setSocketServer(io);

  io.on("connection", (socket) => {
    socket.on("join:kitchen", () => {
      socket.join("kitchen");
    });

    socket.on("join:counter", () => {
      socket.join("counter");
    });

    socket.on("join:waiter", () => {
      socket.join("waiter");
    });
  });
};

startServer();

if (process.env.MONGO_URI) {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
      console.log("MongoDB Connected ✅");
    })
    .catch((err) => {
      console.warn("MongoDB connection failed. The API will keep running without it.");
      console.warn(err.message);
    });
} else {
  console.warn("MONGO_URI is not set. Starting server without database connection.");
}
