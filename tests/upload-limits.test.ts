import { describe, it, expect } from "vitest";
import {
  PHOTO_MAX_BYTES,
  PDF_MAX_BYTES,
  validatePhotoFile,
  validatePdfFile,
} from "@/lib/validation/admin-maid";
import { UPLOAD_TOTAL_MAX_BYTES, formatMegabytes } from "@/lib/upload-limits";
import nextConfig from "../next.config";

/**
 * A 1.1 MB biodata PDF failed to save with "ERROR …@E394" — Next.js's default 1 MB Server Action
 * body limit. These pin the numbers that fix and bound it: the configured body limit must admit a
 * file of that size, must not exceed Vercel's 4.5 MB request cap, and the validators must agree
 * with the budget the form tells staff about.
 */

const file = (type: string, size: number) => ({ type, size }) as File;
const MIB = 1024 * 1024;

describe("Server Action body limit (next.config.ts)", () => {
  const limit = String(nextConfig.experimental?.serverActions?.bodySizeLimit ?? "");

  it("is raised above Next's 1 MB default", () => {
    expect(limit).not.toBe("");
    expect(parseFloat(limit)).toBeGreaterThan(1);
  });

  it("covers the whole photo + PDF budget, and does not promise more than Vercel's 4.5 MB cap", () => {
    const mb = parseFloat(limit); // e.g. "4.5mb" -> 4.5
    expect(mb * MIB).toBeGreaterThanOrEqual(UPLOAD_TOTAL_MAX_BYTES);
    expect(mb).toBeLessThanOrEqual(4.5);
  });
});

describe("upload budget", () => {
  it("is under the platform cap with headroom for the other form fields", () => {
    expect(UPLOAD_TOTAL_MAX_BYTES).toBeLessThan(4.5 * MIB);
  });

  it("the real-world failing file (1,131,301 bytes) now fits, for both file types", () => {
    expect(validatePdfFile(file("application/pdf", 1_131_301)).ok).toBe(true);
    expect(validatePhotoFile(file("image/jpeg", 1_131_301)).ok).toBe(true);
  });

  it("per-file caps equal the combined budget", () => {
    expect(PHOTO_MAX_BYTES).toBe(UPLOAD_TOTAL_MAX_BYTES);
    expect(PDF_MAX_BYTES).toBe(UPLOAD_TOTAL_MAX_BYTES);
  });

  it("a file exactly at the cap passes; one byte over is rejected with a message naming the limit", () => {
    expect(validatePdfFile(file("application/pdf", PDF_MAX_BYTES)).ok).toBe(true);
    const over = validatePdfFile(file("application/pdf", PDF_MAX_BYTES + 1));
    expect(over.ok).toBe(false);
    if (!over.ok) expect(over.message).toMatch(/4 MB/);

    expect(validatePhotoFile(file("image/png", PHOTO_MAX_BYTES)).ok).toBe(true);
    const overPhoto = validatePhotoFile(file("image/png", PHOTO_MAX_BYTES + 1));
    expect(overPhoto.ok).toBe(false);
    if (!overPhoto.ok) expect(overPhoto.message).toMatch(/4 MB/);
  });

  it("formats sizes for the on-screen message", () => {
    expect(formatMegabytes(1_131_301)).toBe("1.1 MB");
    expect(formatMegabytes(5 * MIB)).toBe("5.0 MB");
  });
});
