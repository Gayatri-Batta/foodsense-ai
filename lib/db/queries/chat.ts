import { query } from "../pool";

export interface ChatMessageRow {
  id: string;
  scan_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export async function getChatHistory(scanId: string, limit = 10): Promise<ChatMessageRow[]> {
  const rows = await query<ChatMessageRow>(
    `SELECT * FROM chat_messages WHERE scan_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [scanId, limit],
  );
  return rows.reverse();
}

export async function insertChatMessage(scanId: string, role: "user" | "assistant", content: string): Promise<ChatMessageRow> {
  const rows = await query<ChatMessageRow>(
    `INSERT INTO chat_messages (scan_id, role, content) VALUES ($1, $2, $3) RETURNING *`,
    [scanId, role, content],
  );
  return rows[0];
}
