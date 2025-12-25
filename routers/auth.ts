import { Router } from "express";
import crypto from "crypto";
import { hashSync, compare } from "bcryptjs";
import jwt from "jsonwebtoken";
import { PASSWORD_HASH_SALT } from "@/constants";
import {
  getUserByEmail,
  createUser,
  createAuthMagicLink,
  getValidAuthMagicLinks,
  markAuthMagicLinkUsed,
} from "@/db";
import type { Tables } from "@/database.types";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret";

router.post("/add-user", async (req, res) => {
  try {
    console.info("Add user request body:", req.body);
    const { email, name } = req.body;
    if (!email)
      return res.status(400).json({ success: false, error: "email required" });

    let { data: user } = await getUserByEmail(email);
    if (!user) {
      const { data: newUser, error } = await createUser(email, name);
      if (error)
        return res
          .status(500)
          .json({ success: false, error: "Unable to create user" });
      user = newUser;
    }

    console.info("User found/created:", user);

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashSync(rawToken, PASSWORD_HASH_SALT);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15m

    const { error: insertErr } = await createAuthMagicLink(
      user.id,
      tokenHash,
      expiresAt
    );
    if (insertErr)
      return res
        .status(500)
        .json({ success: false, error: "Unable to create magic link" });

    const url = `${process.env.FRONTEND_URL ?? ""}/auth/magic/${rawToken}`;
    // In prod send email; in dev return url
    return res.json({ success: true, url, userId: user.id });
  } catch (err) {
    console.error("Error creating auth magic link:", err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
});

router.get("/magic/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { data: links, error } = await getValidAuthMagicLinks();
    if (error)
      return res.status(500).json({ success: false, error: "DB error" });

    let matched: Pick<
      Tables<"auth_magic_links">,
      "id" | "token_hash" | "user_id"
    > | null = null;
    for (const l of links ?? []) {
      if (await compare(token, l.token_hash)) {
        matched = l;
        break;
      }
    }

    if (!matched)
      return res
        .status(404)
        .json({ success: false, error: "Invalid or expired token" });

    await markAuthMagicLinkUsed(matched.id);

    const payload = { id: matched.user_id };
    const jwtToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

    return res.json({ success: true, token: jwtToken });
  } catch (err) {
    console.error("Error consuming auth magic link:", err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
});

export default router;
