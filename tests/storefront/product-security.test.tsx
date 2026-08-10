import { describe, expect, it } from "vitest";
import { sanitizeProductHtml } from "../../lib/commerce/product-html";

describe("product HTML security", () => {
  it("removes executable markup, event attributes, and unsafe URL schemes", () => {
    const sanitized = sanitizeProductHtml(`
      <script>alert(1)</script><style>body{display:none}</style>
      <p onclick="alert(2)">Safe <strong>content</strong></p>
      <img src="data:image/svg+xml,<svg onload=alert(3)>" onerror="alert(4)">
      <a href="java&#x73;cript:alert(5)" style="background:url(javascript:alert(6))">bad</a>
      <form action="https://attacker.example"><input autofocus onfocus="alert(7)"></form>
      <svg><a href="javascript:alert(8)">svg</a></svg>
    `);

    expect(sanitized).toContain("<p>Safe <strong>content</strong></p>");
    expect(sanitized).not.toMatch(/script|style=|onclick|onerror|onfocus|javascript:|data:|<form|<input|<svg/i);
  });

  it("keeps only approved HTTPS embeds and forces iframe isolation", () => {
    const sanitized = sanitizeProductHtml(`
      <iframe src="http://www.youtube.com/embed/insecure"></iframe>
      <iframe src="https://attacker.example/embed/1"></iframe>
      <iframe src="https://www.youtube-nocookie.com/embed/abc" allow="autoplay; fullscreen" onload="alert(1)"></iframe>
    `);

    expect(sanitized).not.toContain("http://www.youtube.com");
    expect(sanitized).not.toContain("attacker.example");
    expect(sanitized).toContain('src="https://www.youtube-nocookie.com/embed/abc"');
    expect(sanitized).toContain('sandbox="allow-scripts allow-same-origin allow-presentation"');
    expect(sanitized).toContain('referrerpolicy="no-referrer"');
    expect(sanitized).not.toContain("onload");
  });

  it("handles invalid numeric entities without allowing markup or crashing", () => {
    expect(() => sanitizeProductHtml('<a href="java&#x110000;script:alert(1)">bad</a>')).not.toThrow();
    expect(sanitizeProductHtml('<a href="java&#x110000;script:alert(1)">bad</a>')).toBe("<a>bad</a>");
  });

  it("protects encoded new-window links from opener access", () => {
    const result = sanitizeProductHtml('<a href="https://www.a-jazz.com/" target="_&#x62;lank">driver</a>');
    expect(result).toContain('target="_blank"');
    expect(result).toContain('rel="noopener noreferrer"');
  });

});
