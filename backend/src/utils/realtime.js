let ioServer = null;

export const setSocketServer = (io) => {
  ioServer = io;
};

export const getSocketServer = () => ioServer;

export const emitRealtime = (eventName, payload) => {
  if (!ioServer) {
    return;
  }
  ioServer.emit(eventName, payload);
};
