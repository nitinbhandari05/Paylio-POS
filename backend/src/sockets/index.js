let ioInstance = null;

export const initSockets = (io) => {
  ioInstance = io;
  io.on("connection", (socket) => {
    socket.on("join:kitchen", () => socket.join("kitchen"));
    socket.on("join:counter", () => socket.join("counter"));
    socket.on("join:manager", () => socket.join("manager"));
  });
  return io;
};

export const emitNewOrder = (order) => {
  ioInstance?.emit("new-order", order);
  ioInstance?.to("kitchen").emit("new-order", order);
};

export const emitOrderCompleted = (order) => ioInstance?.emit("order-completed", order);
export const emitPaymentSuccess = (payload) => ioInstance?.emit("payment-success", payload);
export const emitLowStockAlert = (payload) => ioInstance?.emit("low-stock-alert", payload);
