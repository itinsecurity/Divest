import type { AIProvider } from "./types";
import { z } from "zod";

class StubAIProvider implements AIProvider {
  async extractStructuredData(_input: {
    text?: string;
    fileBase64?: string;
    mimeType?: string;
    schema: z.ZodSchema;
    prompt: string;
  }): Promise<{ data: Record<string, unknown>; confidence: number }> {
    throw new Error(
      "AI provider not implemented. Set AI_PROVIDER env var and wire a real provider."
    );
  }
}

export const aiProvider: AIProvider = new StubAIProvider();
