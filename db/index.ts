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
          password: data.password,
          recipient_first_name: data.recipientFirstName,
          recipient_last_name: data.recipientLastName,
          sender_id,
          password_hint: data.passwordHint,
          theme: data.theme,
          type: data.type,
          text: data.text,
        })
      : table.insert({
          password: data.password,
          recipient_first_name: data.recipientFirstName,
          recipient_last_name: data.recipientLastName,
          sender_id,
          type: data.type,
          password_hint: data.passwordHint,
          theme: data.theme,
          video_url: data.videoUrl,
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
