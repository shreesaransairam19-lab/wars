// HTML entity escaping for XSS prevention
// Use this before rendering any user-generated content

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
  "`": "&#96;",
};

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"'`/]/g, (char) => HTML_ENTITIES[char] ?? char);
}

// Strip all HTML tags (for plain text contexts)
export function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "");
}

// Sanitize text for chat messages (allow emoji, strip HTML)
export function sanitizeChatMessage(text: string): string {
  return stripHtml(text).trim();
}

// Sanitize text for reviews (allow basic line breaks, strip HTML)
export function sanitizeReview(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/\r\n/g, "\n")
    .trim();
}

// Check for potentially harmful content
export function containsHarmfulContent(text: string): boolean {
  const patterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /data:\s*text\/html/gi,
    /vbscript:/gi,
  ];
  return patterns.some((pattern) => pattern.test(text));
}
