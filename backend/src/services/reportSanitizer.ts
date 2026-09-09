const MAX_REPORT_LENGTH = 20_000;

/**
 * Defense-in-depth on the AI's output: bound the length and make it impossible for the markdown
 * to carry an HTML element at all. The frontend is the primary control here — react-markdown
 * without rehype-raw never renders raw HTML — but the report is also downloadable, and the
 * backend shouldn't hand out markdown that turns into script the moment someone opens it in a
 * renderer that *does* allow HTML.
 *
 * Escaping `<` rather than stripping `<...>` spans: a strip regex needs a closing `>` to match,
 * so an unterminated tag (`<img src=x onerror=...` with no `>`) passes through untouched, and
 * lenient HTML parsers will finish it at EOF. Escaping has no such edge — the output contains no
 * `<` at all, so no element can be formed from any input. Markdown renders `&lt;` back to a
 * literal `<` in prose; inside code fences it stays visible as the entity, which is an acceptable
 * cosmetic trade for a guarantee rather than a filter.
 */
export function sanitizeReport(markdown: string): { markdown: string; truncated: boolean } {
  const escaped = markdown.replace(/</g, "&lt;");
  const truncated = escaped.length > MAX_REPORT_LENGTH;
  return {
    markdown: truncated ? `${escaped.slice(0, MAX_REPORT_LENGTH)}\n\n_[report truncated]_` : escaped,
    truncated,
  };
}
