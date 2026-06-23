import { InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { getBedrockClient, EMBED_MODEL_ID } from "./bedrock";

// Titan Embed Text v2 returns 1024-dim vectors by default — matches the
// `nutrition_items.embedding vector(1024)` column in db/schema.sql.
// If you swap embedding models, update both the dimension here and the column.
export async function embedText(text: string): Promise<number[]> {
  const client = getBedrockClient();

  const command = new InvokeModelCommand({
    modelId: EMBED_MODEL_ID,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({ inputText: text }),
  });

  const response = await client.send(command);
  const body = JSON.parse(new TextDecoder().decode(response.body));
  return body.embedding as number[];
}
