import { PASSWORD_HASH_SALT } from "@/constants";
import { requireAuth } from "@/lib/auth";
import { 
      addReply, 
      createMessage, 
      getAnalytics, 
      getMessageBySlug,
      createMagicLink,
      logOpen, 
      markMagicLinkUsed,
      getValidMagicLinks
} from "@/db";
import {
  createMessageSchema,
  openMessageSchema,
  replySchema,
} from "@/lib/schemas";
import { multerUpload } from "@/lib/services";
import { uploadToCloudinary } from "@/lib/utils";
import { compare, hashSync } from "bcryptjs";
import { Router } from "express";
import { z } from "zod";

import crypto from "crypto";


const router = Router();

router.post("/", requireAuth, multerUpload.single("file"), async (req, res) => {
  try {
    const form = createMessageSchema.parse(req.body);
    const hashedPassword = hashSync(form.password, PASSWORD_HASH_SALT);

    if (form.type === "video" && !req.file) {
      return res.status(400).json({
        success: false,
        message: "Video type requires a file upload",
      });
    }

    const senderId = (req as any).user?.id;
    if (!senderId) return res.status(401).json({ success: false, error: "Unauthorized" });

    const { error, data } = await (form.type === "text"
      ? createMessage(senderId, {
          ...form,
          password: hashedPassword,
        })
      : uploadToCloudinary(
          req.file!.buffer,
          req.file!.filename,
          req.file!.mimetype,
        )
            .then((videoUrl) =>
            createMessage(senderId, {
              ...form,
              password: hashedPassword,
              videoUrl,
            }),
          )
          .catch((error) => {
            console.error("Error uploading card video:", error);
            return {
              data: null,
              error:
                error instanceof Error
                  ? error
                  : new Error(
                      "Unable to upload video card. Please try again later",
                    ),
            };
          }));

    if (error) throw error;

    return res.status(201).json({
      success: true,
      slug: data.slug,
    });
  } catch (err) {
    console.error("Error creating card", err);

    if (err instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        errors: err.flatten(),
      });
    }

    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

router.get("/:slug/exists", async (req, res) => {
  const { slug } = req.params;
  const message = await getMessageBySlug(slug!);
  return res.json({
    success: true,
    exists: Boolean(message.data),
  });
});

router.post("/:slug/open", async (req, res) => {
  try {
    const { slug } = req.params;
    const data = openMessageSchema.parse(req.body);

    const { data: message, error } = await getMessageBySlug(slug!);

    // Mock message lookup
    if (!message) {
      console.warn("Cannot find message identified by slug:", slug, error);
      return res.status(404).json({
        success: false,
        error: "Message not found",
      });
    }

    // Password check against stored hash
    const isPasswordValid = await compare(data.password, message.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: "Invalid password",
      });
    }

    // Mock analytics log
    console.info("Message opened by:", data.firstName, data.lastName);

    return res.json({
      success: true,
      data: message,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        errors: err.flatten(),
      });
    }

    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

router.get("/:slug/download", async (req, res) => {
  const { firstName, lastName } = req.query;
  const { slug } = req.params;

  const { data: message, error } = await getMessageBySlug(slug!);

  if (!message) {
    console.warn("Cannot find message identified by slug:", slug, error);
    return res.status(404).json({
      success: false,
      error: "Message not found",
    });
  }

  if (!firstName || !lastName) {
    return res.status(400).json({
      success: false,
      error: "First name and last name are required",
    });
  }

  console.info("Download by:", firstName, lastName);

  if (!message.video_url) {
    console.warn("Message do be downloaded does not have a video:", slug);
    return res.status(400).json({
      success: false,
      error: "Message does not have a downloadable video",
    });
  }

  return res.download(message.video_url);
});

router.post("/:slug/reply", async (req, res) => {
  try {
    const { slug } = req.params;
    const data = replySchema.parse(req.body);

    const { data: message, error } = await getMessageBySlug(slug);

    if (!message || error) {
      return res.status(404).json({
        success: false,
        error: "Message not found",
      });
    }

    await addReply({
      message_id: message.id,
      replier_first_name: data.firstName,
      replier_last_name: data.lastName,
      reply_text: data.replyText,
    });

    return res.status(201).json({
      success: true,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        errors: err.flatten(),
      });
    }

    console.error("Error adding reply:", err);

    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

router.get("/:slug/analytics", async (req, res) => {
  try {
    const { slug } = req.params;

    const { data, error } = await getAnalytics(slug);

    if (!data || error) {
      return res.status(404).json({
        success: false,
        error: "Message not found",
      });
    }

    return res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("Error fetching analytics:", err);

    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});


router.post("/:slug/magic", requireAuth, async (req, res) => {
  try {
    const { slug } = req.params;

    if (!slug) {
  return res.status(400).json({
    success: false,
    error: "Slug is required",
  });
}

    const senderId = (req as any).user?.id;
    if (!senderId) return res.status(401).json({ success: false, error: "Unauthorized" });

    const { data: message, error } = await getMessageBySlug(slug);
    if (!message || error) return res.status(404).json({ success: false, error: "Message not found" });

    if (message.sender_id !== senderId) return res.status(403).json({ success: false, error: "Forbidden" });

    // Generate token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashSync(rawToken, PASSWORD_HASH_SALT);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h expiry

    const { data: magicLink, error: insertError } = await createMagicLink(message.id!, tokenHash, expiresAt);
    if (insertError) throw insertError;

    const url = `${process.env.FRONTEND_URL}/magic/${rawToken}`;
    return res.status(201).json({ success: true, url });
  } catch (err) {
    console.error("Error creating magic link:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});



router.get("/magic/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const { data: links, error } = await getValidMagicLinks();
    if (error) throw error;

    if (!links || links.length === 0) {
      return res.status(404).json({ success: false, error: "Invalid or expired magic link" });
    }

    // Compare tokens using bcrypt
    let validLink = null;
    for (const link of links) {
      const isMatch = await compare(token, link.token_hash);
      if (isMatch) {
        validLink = link;
        break;
      }
    }

    if (!validLink) {
      return res.status(404).json({ success: false, error: "Invalid or expired magic link" });
    }

    // Mark as used
    await markMagicLinkUsed(validLink.id);

    // Log open
    await logOpen({ 
      message_id: validLink.message_id,
      opener_first_name: "MagicLink",
      opener_last_name: "User",
      timestamp: new Date().toISOString(),
    });

    // Return message
    const { data: message, error: messageError } = await getMessageBySlug(validLink.message_id);
    if (!message || messageError) return res.status(404).json({ success: false, error: "Message not found" });

    return res.json({ success: true, data: message });
  } catch (err) {
    console.error("Error consuming magic link:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});





export default router;
