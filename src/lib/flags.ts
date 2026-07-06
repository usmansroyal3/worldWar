// ISO 3166-1 alpha-2 → emoji flag via Unicode regional indicator symbols.
// 'IN' → 🇮🇳, 'US' → 🇺🇸. Returns 🌐 for unknown/missing codes.
export function flagEmoji(code: string | null | undefined): string {
  if (!code || code.length !== 2) return '🌐';
  const upper = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return '🌐';
  return String.fromCodePoint(
    0x1f1e6 + upper.charCodeAt(0) - 65,
    0x1f1e6 + upper.charCodeAt(1) - 65,
  );
}
