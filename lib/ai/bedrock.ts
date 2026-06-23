import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";

let client: BedrockRuntimeClient | null = null;

export function getBedrockClient(): BedrockRuntimeClient {
  if (client) return client;
  client = new BedrockRuntimeClient({ region: process.env.BEDROCK_REGION ?? "us-east-1" });
  return client;
}

export const MODEL_ID = process.env.BEDROCK_MODEL_ID ?? "anthropic.claude-3-5-sonnet-20241022-v2:0";
export const EMBED_MODEL_ID = process.env.BEDROCK_EMBED_MODEL_ID ?? "amazon.titan-embed-text-v2:0";
