export interface ShareInviteOptions {
  estateName: string;
  inviteCode: string;
  recipientName?: string;
  recipientEmail?: string;
  recipientPhone?: string;
}

export function buildInviteMessage(opts: ShareInviteOptions): string {
  const { estateName, inviteCode, recipientName } = opts;
  const greeting = recipientName ? `Hi ${recipientName}, ` : "";
  const appUrl = buildInviteUrl(inviteCode);
  return `${greeting}you're invited to join ${estateName} on Koneksi! Use invite code *${inviteCode}* or tap the link to join: ${appUrl}`;
}

export function buildInviteUrl(inviteCode: string): string {
  return `${window.location.origin}/join-estate?code=${inviteCode}`;
}

export function buildWhatsAppHref(message: string, phone?: string): string {
  const encoded = encodeURIComponent(message);
  return phone
    ? `https://wa.me/${phone.replace(/\D/g, "")}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
}

export function buildEmailHref(opts: ShareInviteOptions): string {
  const message = buildInviteMessage(opts);
  return `mailto:${opts.recipientEmail ?? ""}?subject=Join ${opts.estateName} on Koneksi&body=${encodeURIComponent(message)}`;
}

export function buildSmsHref(message: string, phone?: string): string {
  return `sms:${phone ?? ""}?body=${encodeURIComponent(message)}`;
}
