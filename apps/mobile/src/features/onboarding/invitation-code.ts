// Only recognize the invitation format; never open arbitrary scanned links.
export function parseInvitationCode(value: string): string | null {
  const normalized = value.trim().toUpperCase();
  if (/^[A-HJ-KM-NP-Z2-9]{6}$/.test(normalized)) return normalized;
  const match = /^WEAVE:\/\/JOIN\?CODE=([A-HJ-KM-NP-Z2-9]{6})$/.exec(normalized);
  return match?.[1] ?? null;
}
export function invitationUri(code: string): string {
  return `weave://join?code=${encodeURIComponent(code)}`;
}
