import { Router, Request, Response } from "express";
import { prisma } from "../../config/database.js";
import { authenticate } from "../../middleware/authenticate.js";

const router = Router();

// List channels
router.get("/channels", authenticate, async (_req: Request, res: Response) => {
  const channels = await prisma.chatChannel.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { messages: true } } },
  });
  res.json(channels);
});

// Get messages for a channel (paginated)
router.get(
  "/channels/:id/messages",
  authenticate,
  async (req: Request, res: Response) => {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const before = req.query.before as string | undefined;

    const where: any = { channelId: req.params.id };
    if (before) {
      where.createdAt = { lt: new Date(before) };
    }

    const messages = await prisma.chatMessage.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    res.json(messages.reverse());
  },
);

export default router;
