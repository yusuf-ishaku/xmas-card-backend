import z from "zod";

const baseMessageSchema = z.object({
  recipientFirstName: z.string().min(1),
  recipientLastName: z.string().min(1),
  password: z.string().min(1),
  passwordHint: z.string().optional(),
  theme: z.string().min(1),
  hint: z.string().optional(),
  senderId: z.string().min(1),
});

const textMessageSchema = baseMessageSchema.extend({
  type: z.literal("text"),
  text: z.string().min(1),
});
export type TextMessage = z.infer<typeof textMessageSchema>;

const videoMessageSchema = baseMessageSchema.extend({
  type: z.literal("video"),
});
export type VideoMessage = z.infer<typeof videoMessageSchema>;

export const createMessageSchema = z.discriminatedUnion("type", [
  textMessageSchema,
  videoMessageSchema,
]);
export type CreateMessage = z.infer<typeof createMessageSchema>;

export const openMessageSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  password: z.string().min(1),
});

export const replySchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  replyText: z.string().min(1),
});
