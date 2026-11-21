import { Server, Socket } from "socket.io";
import { verifyAccessToken } from "../../utils/jwt.js";
import { prisma } from "../../config/database.js";

export function setupChatSocket(io: Server): void {
  // Auth middleware
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Authentication required"));
    }
    try {
      const payload = verifyAccessToken(token);
      (socket as any).user = payload;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const user = (socket as any).user;
    console.log(`Socket connected: ${user.email}`);

    // Join a channel
    socket.on("join_channel", (channelId: string) => {
      socket.join(`channel:${channelId}`);
    });

    // Leave a channel
    socket.on("leave_channel", (channelId: string) => {
      socket.leave(`channel:${channelId}`);
    });

    // Send message
    socket.on(
      "send_message",
      async (data: { channelId: string; content: string }) => {
        if (!data.content?.trim() || !data.channelId) return;

        const message = await prisma.chatMessage.create({
          data: {
            content: data.content.trim().slice(0, 2000),
            userId: user.userId,
            channelId: data.channelId,
          },
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        });

        io.to(`channel:${data.channelId}`).emit("new_message", message);
      },
    );

    // Typing indicator
    socket.on("typing", (channelId: string) => {
      socket
        .to(`channel:${channelId}`)
        .emit("user_typing", { userId: user.userId, name: user.email });
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${user.email}`);
    });
  });
}
