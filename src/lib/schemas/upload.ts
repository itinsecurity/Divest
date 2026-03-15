export const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "text/plain",
  "text/csv",
  "text/markdown",
] as const;

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export type ValidationResult = { valid: true } | { valid: false; error: string };

/**
 * Validates a file for upload — exported for unit testing.
 * Accepts an optional overrideSize to simulate large files in tests.
 */
export function validateUploadFile(
  file: File,
  overrideSize?: number
): ValidationResult {
  const size = overrideSize ?? file.size;

  if (size > MAX_FILE_SIZE) {
    return { valid: false, error: "File exceeds 5 MB limit" };
  }

  if (!(ACCEPTED_MIME_TYPES as readonly string[]).includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported file type "${file.type}". Accepted: PDF, PNG, JPG, TXT, CSV, MD`,
    };
  }

  return { valid: true };
}
