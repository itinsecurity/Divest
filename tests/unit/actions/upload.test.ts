import { describe, it, expect } from "vitest";
import { validateUploadFile, ACCEPTED_MIME_TYPES, MAX_FILE_SIZE } from "@/lib/schemas/upload";

describe("validateUploadFile", () => {
  function makeFile(name: string, type: string, size: number): File {
    const blob = new Blob(["x".repeat(Math.min(size, 100))], { type });
    // Override size property since Blob size = actual bytes
    return new File([blob], name, { type });
  }

  it("accepts PDF files", () => {
    const file = makeFile("report.pdf", "application/pdf", 1024);
    const result = validateUploadFile(file);
    expect(result.valid).toBe(true);
  });

  it("accepts PNG images", () => {
    const file = makeFile("scan.png", "image/png", 1024);
    const result = validateUploadFile(file);
    expect(result.valid).toBe(true);
  });

  it("accepts JPEG images", () => {
    const file = makeFile("scan.jpg", "image/jpeg", 1024);
    const result = validateUploadFile(file);
    expect(result.valid).toBe(true);
  });

  it("accepts plain text files", () => {
    const file = makeFile("data.txt", "text/plain", 1024);
    const result = validateUploadFile(file);
    expect(result.valid).toBe(true);
  });

  it("accepts CSV files", () => {
    const file = makeFile("data.csv", "text/csv", 1024);
    const result = validateUploadFile(file);
    expect(result.valid).toBe(true);
  });

  it("accepts markdown files", () => {
    const file = makeFile("report.md", "text/markdown", 1024);
    const result = validateUploadFile(file);
    expect(result.valid).toBe(true);
  });

  it("rejects unsupported file types", () => {
    const file = makeFile("virus.exe", "application/octet-stream", 1024);
    const result = validateUploadFile(file);
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.error).toContain("Unsupported");
  });

  it("rejects files over 5MB limit", () => {
    // Create a file that reports being over 5MB
    const bigContent = "x".repeat(100);
    const blob = new Blob([bigContent], { type: "application/pdf" });
    const file = new File([blob], "big.pdf", { type: "application/pdf" });
    // Simulate oversized file by checking the constant
    const oversize = MAX_FILE_SIZE + 1;
    const result = validateUploadFile(file, oversize);
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.error).toContain("5 MB");
  });

  it("exports correct accepted types list", () => {
    expect(ACCEPTED_MIME_TYPES).toContain("application/pdf");
    expect(ACCEPTED_MIME_TYPES).toContain("image/png");
    expect(ACCEPTED_MIME_TYPES).toContain("image/jpeg");
    expect(ACCEPTED_MIME_TYPES).toContain("text/plain");
    expect(ACCEPTED_MIME_TYPES).toContain("text/csv");
    expect(ACCEPTED_MIME_TYPES).toContain("text/markdown");
  });
});
