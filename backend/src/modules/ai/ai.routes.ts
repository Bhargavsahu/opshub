import { Router, Request, Response } from "express";
import { z } from "zod";
import { GoogleGenerativeAI, type FunctionDeclaration } from "@google/generative-ai";
import { authenticate } from "../../middleware/authenticate.js";
import { validate } from "../../middleware/validate.js";
import { env } from "../../config/env.js";
import { toolDefinitions, executeTool } from "./ai.tools.js";
import { logAudit } from "../../middleware/audit.js";
import { AppError } from "../../utils/errors.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();

const chatSchema = z.object({
  message: z.string().min(1).max(1000),
});

// Simple in-memory rate limiter per user
const rateLimiter = new Map<string, { count: number; resetAt: number }>();
const MAX_REQUESTS = 10;
const WINDOW_MS = 60 * 1000;

function checkRateLimit(userId: string): void {
  const now = Date.now();
  const entry = rateLimiter.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimiter.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }

  if (entry.count >= MAX_REQUESTS) {
    throw AppError.tooMany("AI assistant rate limit: 10 requests per minute");
  }

  entry.count++;
}

router.post(
  "/chat",
  authenticate,
  validate(chatSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { userId, role, email } = req.user!;

    if (!env.GEMINI_API_KEY) {
      res.json({
        reply:
          "AI assistant is not configured. Please set GEMINI_API_KEY in the environment.",
      });
      return;
    }

    checkRateLimit(userId);

    try {
      const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: env.GEMINI_MODEL,
        tools: [
          {
            functionDeclarations: toolDefinitions.map((t) => ({
              name: t.name,
              description: t.description,
              parameters: t.parameters,
            })) as FunctionDeclaration[],
          },
        ],
        systemInstruction: `You are OpsHub AI Assistant. You help users query their company data.
Current user: ${email} (role: ${role}).
You can ONLY read data using the provided tools. You cannot modify any data.
If the user asks to change something, politely explain you can only read data.
If a tool returns an error about permissions, explain the user's role doesn't have access.
Be concise and helpful. Format data in a readable way.`,
      });

      const chat = model.startChat();
      let response = await chat.sendMessage(req.body.message);

      // Handle function calling loop (max 5 iterations for safety)
      let iterations = 0;
      while (iterations < 5) {
        const candidate = response.response.candidates?.[0];
        const parts = candidate?.content?.parts ?? [];

        const functionCalls = parts.filter((p: any) => p.functionCall);
        if (functionCalls.length === 0) break;

        // Execute all function calls
        const functionResponses = await Promise.all(
          functionCalls.map(async (part: any) => {
            const result = await executeTool(
              part.functionCall.name,
              part.functionCall.args ?? {},
              userId,
              role,
            );
            return {
              functionResponse: {
                name: part.functionCall.name,
                response: { result },
              },
            };
          }),
        );

        response = await chat.sendMessage(functionResponses);
        iterations++;
      }

      const reply =
        response.response.candidates?.[0]?.content?.parts
          ?.map((p: any) => p.text)
          .filter(Boolean)
          .join("\n") ?? "I could not generate a response.";

      await logAudit({
        userId,
        action: "ai.chat",
        entity: "AIAssistant",
        diff: {
          question: req.body.message.slice(0, 200),
          toolsUsed: iterations,
        },
        ip: req.ip,
      });

      res.json({ reply });
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      console.error("AI assistant error:", err);
      res.json({
        reply:
          "Sorry, I encountered an error processing your request. Please try again.",
      });
    }
  }),
);

export default router;
