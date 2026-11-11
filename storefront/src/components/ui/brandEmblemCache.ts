/**
 * Legacy Brand Emblem Storage Cleaner.
 * Purges legacy base64 data to avoid persistent aspect ratio distortion on user devices.
 */
export function purgeLegacyBrandEmblem(): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem("vastire_brand_emblem_uri");
    } catch {
      // Safe no-op
    }
  }
}
