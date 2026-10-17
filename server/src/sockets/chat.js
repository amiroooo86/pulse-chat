import jwt from "jsonwebtoken";
export function registerSockets(io) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) throw new Error("Missing token");
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });
  io.on("connection", socket => {
    const userRoom = `user:${socket.user.id}`;
    socket.join(userRoom);
    socket.on("join:group", groupId => {
      if (groupId) socket.join(`group:${Number(groupId)}`);
    });
    socket.on("join:conversation", conversationId => {
      if (conversationId) socket.join(`conversation:${Number(conversationId)}`);
    });
    socket.on("typing", (payload = {}) => {
      const room = payload.groupId ? `group:${Number(payload.groupId)}` : payload.conversationId ? `conversation:${Number(payload.conversationId)}` : null;
      if (room) {
        socket.to(room).emit("typing", {
          username: socket.user.username
        });
      }
    });
  });
}
