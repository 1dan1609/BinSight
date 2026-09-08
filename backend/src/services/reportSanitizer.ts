const MAX_REPORT_LENGTH = 20_000;

/**
 * Defense-in-depth on the AI's output: enforce a max length and strip raw HTML tags. The
 * frontend also never renders raw HTML (react-markdown without rehype-raw), but the backend
 * should not hand a client markdown that could smuggle an HTML/script payload either.
 */
export function sanitizeReport(markdown: string): { markdown: string; truncated: boolean } {
  const stripped = markdown.replace(/<[^>]*>/g, "");
  const truncated = stripped.length > MAX_REPORT_LENGTH;
  return {
    markdown: truncated ? `${stripped.slice(0, MAX_REPORT_LENGTH)}\n\n_[report truncated]_` : stripped,
    truncated,
  };
}
