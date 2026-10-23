import { describe, it, expect } from "vitest";
import {
  escapeHtml,
  stripHtml,
  sanitizeChatMessage,
  sanitizeReview,
  containsHarmfulContent,
} from "@/lib/security/sanitize";

describe("escapeHtml", () => {
  it("should escape HTML entities", () => {
    expect(escapeHtml("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;&#x2F;script&gt;"
    );
  });

  it("should escape ampersands", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });

  it("should handle plain text", () => {
    expect(escapeHtml("hello world")).toBe("hello world");
  });
});

describe("stripHtml", () => {
  it("should remove all HTML tags", () => {
    expect(stripHtml("<b>bold</b> text")).toBe("bold text");
  });

  it("should handle nested tags", () => {
    expect(stripHtml("<div><span>hello</span></div>")).toBe("hello");
  });
});

describe("sanitizeChatMessage", () => {
  it("should strip HTML and trim", () => {
    expect(sanitizeChatMessage("  <img src=x onerror=alert(1)>  ")).toBe("");
  });

  it("should preserve emoji", () => {
    expect(sanitizeChatMessage("Hello 👋🎉")).toBe("Hello 👋🎉");
  });

  it("should preserve plain text", () => {
    expect(sanitizeChatMessage("Hello world!")).toBe("Hello world!");
  });
});

describe("sanitizeReview", () => {
  it("should strip HTML tags", () => {
    expect(sanitizeReview("Great <script>evil</script> manga!")).toBe(
      "Great evil manga!"
    );
  });

  it("should preserve line breaks", () => {
    expect(sanitizeReview("Line 1\nLine 2")).toBe("Line 1\nLine 2");
  });
});

describe("containsHarmfulContent", () => {
  it("should detect script tags", () => {
    expect(containsHarmfulContent("<script>alert(1)</script>")).toBe(true);
  });

  it("should detect javascript protocol", () => {
    expect(containsHarmfulContent("javascript:alert(1)")).toBe(true);
  });

  it("should not flag normal text", () => {
    expect(containsHarmfulContent("Hello world!")).toBe(false);
  });
});
