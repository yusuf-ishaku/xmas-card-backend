import type { TablesInsert } from "@/database.types";
import type { TextMessage, VideoMessage } from "@/lib/schemas";
import { supabase } from "@/lib/services";

export async function getMessageBySlug(slug: string) {
  return await supabase.from("messages").select("*").eq("slug", slug).single();
}

export async function createMessage(
  sender_id: string,
  data:
    | TextMessage
    | (VideoMessage & {
        videoUrl: string;
      }),
) {
  const table = supabase.from("messages");
  const insert =
    data.type === "text"
      ? table.insert({
          recipient_first_name: data.recipientFirstName,
          recipient_last_name: data.recipientLastName,
          sender_id,
          theme: data.theme,
          type: data.type,
          text: data.text,
          slug: Math.random().toString(36).substring(2, 8),
        })
      : table.insert({
          recipient_first_name: data.recipientFirstName,
          recipient_last_name: data.recipientLastName,
          sender_id,
          type: data.type,
          theme: data.theme,
          video_url: data.videoUrl,
          slug: Math.random().toString(36).substring(2, 8),
        });
  return insert.select("id,slug").single();
}

export async function logOpen(data: TablesInsert<"opens">) {
  await supabase.from("opens").insert(data);
}

export async function logDownload(data: TablesInsert<"downloads">) {
  await supabase.from("downloads").insert(data);
}

export async function addReply(data: TablesInsert<"replies">) {
  await supabase.from("replies").insert(data);
}

export async function getAnalytics(slug: string) {
  return supabase
    .from("messages")
    .select("id, opens(*), downloads(*), replies(*)")
    .eq("slug", slug)
    .single();
}


export async function createMagicLink(
  message_id: string,
  token_hash: string,
  expires_at: string,
) {
  return supabase
    .from("magic_links")
    .insert({
      message_id,
      token_hash,
      expires_at,
    })
    .select("id, message_id")
    .single();
}


export async function getValidMagicLinks() {
  return supabase
    .from("magic_links")
    .select("id, token_hash, message_id")
    .eq("used", false)
    .gt("expires_at", new Date().toISOString());
}


export async function markMagicLinkUsed(id: string) {
  return supabase
    .from("magic_links")
    .update({ used: true })
    .eq("id", id);
}

// --- User helpers (for auth flows)
export async function getUserByEmail(email: string) {
  return supabase.from("users").select("*").eq("email", email).single();
}

export async function createUser(email: string, name?: string) {
  return supabase
    .from("users")
    .insert({ email, name })
    .select("*")
    .single();
}

// --- Auth magic links helpers
export async function createAuthMagicLink(
  user_id: string,
  token_hash: string,
  expires_at: string,
) {
  return supabase
    .from("auth_magic_links")
    .insert({ user_id, token_hash, expires_at })
    .select("id, user_id")
    .single();
}

export async function getValidAuthMagicLinks() {
  return supabase
    .from("auth_magic_links")
    .select("id, token_hash, user_id")
    .eq("used", false)
    .gt("expires_at", new Date().toISOString());
}

export async function markAuthMagicLinkUsed(id: string) {
  return supabase
    .from("auth_magic_links")
    .update({ used: true })
    .eq("id", id);
}
