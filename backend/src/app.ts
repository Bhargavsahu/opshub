import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import { Server } from "socket.io";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error.js";
import authRoutes from "./modules/auth/auth.routes.js";
import usersRoutes from "./modules/users/users.routes.js";
import leaveRoutes from "./modules/leave/leave.routes.js";
import inventoryRoutes from "./modules/inventory/inventory.routes.js";
import tasksRoutes from "./modules/tasks/tasks.routes.js";
import chatRoutes from "./modules/chat/chat.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import aiRoutes from "./modules/ai/ai.routes.js";
import { setupChatSocket } from "./modules/chat/chat.socket.js";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: env.FRONTEND_URL,
    credentials: true,
  },
});
setupChatSocket(io);

app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

if (env.NODE_ENV !== "test") {
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 500,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/leave", leaveRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/ai", aiRoutes);

app.use(errorHandler);

export { app, httpServer, io };
