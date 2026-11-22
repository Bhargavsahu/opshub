import { Router, Request, Response } from "express";
import { validate } from "../../middleware/validate.js";
import { googleLoginSchema, demoLoginSchema } from "./auth.schema.js";
import {
  loginWithGoogle,
  loginWithDemo,
  refreshAccessToken,
  logout,
} from "./auth.service.js";
import { authenticate } from "../../middleware/authenticate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();

const REFRESH_COOKIE = "opshub_refresh";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/api/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// Google login
router.post(
  "/google",
  validate(googleLoginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await loginWithGoogle(req.body.idToken, req.ip);
    res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS);
    res.json({ accessToken: result.accessToken, user: result.user });
  }),
);

// Demo login (seeded demo accounts only)
router.post(
  "/demo",
  validate(demoLoginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await loginWithDemo(req.body.email, req.ip);
    res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS);
    res.json({ accessToken: result.accessToken, user: result.user });
  }),
);

// Refresh token rotation
router.post("/refresh", asyncHandler(async (req: Request, res: Response) => {
  const oldToken = req.cookies?.[REFRESH_COOKIE];
  if (!oldToken) {
    res.status(401).json({ error: "No refresh token" });
    return;
  }

  const result = await refreshAccessToken(oldToken, req.ip);
  res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS);
  res.json({ accessToken: result.accessToken, user: result.user });
}));

// Logout
router.post("/logout", asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) {
    await logout(token);
  }
  res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
  res.json({ message: "Logged out" });
}));

// Get current user
router.get("/me", authenticate, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

export default router;
