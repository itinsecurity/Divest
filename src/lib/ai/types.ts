import { z } from "zod";

export interface AIProvider {
  extractStructuredData(input: {
    text?: string;
    fileBase64?: string;
    mimeType?: string;
    schema: z.ZodSchema;
    prompt: string;
  }): Promise<{ data: Record<string, unknown>; confidence: number }>;
}
