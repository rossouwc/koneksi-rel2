function baseLayout(title: string, bodyContent: string, footerNote?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#0d9488;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d9488;background:linear-gradient(135deg,#0f766e 0%,#10b981 100%);padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="padding:0 0 28px;text-align:center;">
              <span style="font-size:30px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Koneksi</span>
              <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.85);letter-spacing:0.5px;">${title}</p>
            </td>
          </tr>

          <!-- Body card -->
          <tr>
            <td style="background:#ffffff;padding:40px 40px 32px;border-radius:12px 12px 0 0;">
              ${bodyContent}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f0fdf9;border-top:1px solid #d1fae5;border-radius:0 0 12px 12px;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                ${footerNote || "You are receiving this email because of activity on your Koneksi estate account."}
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:#d1d5db;">&copy; ${new Date().getFullYear()} Koneksi. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(url: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr>
      <td style="border-radius:8px;background-color:#0d9488;">
        <a href="${url}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;background-color:#0d9488;">${label}</a>
      </td>
    </tr>
  </table>`;
}

function greeting(name: string): string {
  return `<p style="margin:0 0 16px;font-size:16px;color:#111827;font-weight:600;">Hi ${name},</p>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">${text}</p>`;
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />`;
}

function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 0;font-size:14px;color:#6b7280;width:140px;">${label}</td>
    <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:500;">${value}</td>
  </tr>`;
}

export function providerInviteEmail(
  providerName: string,
  inviterName: string,
  estateName: string,
  inviteUrl: string,
  category: string
): { subject: string; html: string; text: string } {
  const subject = `You've been invited to join ${estateName} on Koneksi`;

  const bodyContent = `
    ${greeting(providerName)}
    ${paragraph(`<strong>${inviterName}</strong> has invited you to join <strong>${estateName}</strong> as a service provider on Koneksi.`)}
    ${paragraph("Click the button below to register and get started:")}
    ${ctaButton(inviteUrl, "Accept Invitation")}
    ${divider()}
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      ${infoRow("Estate:", estateName)}
      ${infoRow("Category:", category || "General")}
      ${infoRow("Invited by:", inviterName)}
    </table>
    ${divider()}
    ${paragraph(`If the button doesn't work, copy and paste this link into your browser:<br/><a href="${inviteUrl}" style="color:#0d9488;word-break:break-all;">${inviteUrl}</a>`)}
  `;

  const html = baseLayout("Provider Invitation", bodyContent);

  const text = `Hi ${providerName},\n\nYou've been invited by ${inviterName} to join Koneksi as a provider for ${estateName}.\n\nClick the link below to register:\n${inviteUrl}\n\nCategory: ${category || "General"}\n\nKoneksi Team`;

  return { subject, html, text };
}

export function adminInviteNotificationEmail(
  adminName: string,
  providerName: string,
  category: string,
  estateName: string,
  inviterName: string
): { subject: string; html: string; text: string } {
  const subject = `New provider invitation sent for ${estateName}`;

  const bodyContent = `
    ${greeting(adminName)}
    ${paragraph(`A new provider invitation has been sent from <strong>${estateName}</strong>.`)}
    ${divider()}
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      ${infoRow("Provider:", providerName)}
      ${infoRow("Category:", category || "General")}
      ${infoRow("Estate:", estateName)}
      ${infoRow("Invited by:", inviterName)}
    </table>
    ${divider()}
    ${paragraph("You are receiving this notification as an estate administrator. No action is required at this time.")}
  `;

  const html = baseLayout("Admin Notification", bodyContent, "You are receiving this email because you are an administrator of this estate.");

  const text = `Hi ${adminName},\n\nA new provider invitation was sent to ${providerName} (${category || "General"}) for ${estateName}.\n\nInvited by: ${inviterName}\n\nKoneksi Team`;

  return { subject, html, text };
}

export function providerApprovedEmail(
  providerName: string,
  estateName: string
): { subject: string; html: string; text: string } {
  const subject = `You've been approved for ${estateName} on Koneksi`;

  const bodyContent = `
    ${greeting(providerName)}
    ${paragraph(`Great news! Your application to join <strong>${estateName}</strong> as a service provider has been <strong style="color:#0d9488;">approved</strong>.`)}
    ${paragraph("You can now log in to Koneksi and start receiving service requests from residents.")}
    ${ctaButton("https://koneksi.app/login", "Log In to Koneksi")}
    ${divider()}
    ${paragraph("Welcome to the Koneksi provider network. We look forward to seeing you thrive!")}
  `;

  const html = baseLayout("Application Approved", bodyContent);

  const text = `Hi ${providerName},\n\nGreat news! You've been approved as a provider for ${estateName} on Koneksi.\n\nYou can now log in and start receiving service requests.\n\nKoneksi Team`;

  return { subject, html, text };
}

export function providerRejectedEmail(
  providerName: string,
  estateName: string
): { subject: string; html: string; text: string } {
  const subject = `Update on your provider application for ${estateName}`;

  const bodyContent = `
    ${greeting(providerName)}
    ${paragraph(`Thank you for your interest in joining <strong>${estateName}</strong> on Koneksi.`)}
    ${paragraph("After careful consideration, the estate administrator has decided not to proceed with your application at this time.")}
    ${divider()}
    ${paragraph("We appreciate your interest and encourage you to explore other opportunities on the Koneksi platform. If you have any questions, please reach out to the estate admin directly.")}
  `;

  const html = baseLayout("Application Update", bodyContent);

  const text = `Hi ${providerName},\n\nThank you for your interest in joining ${estateName} on Koneksi. After careful consideration, the estate admin has decided not to proceed with your application at this time.\n\nWe appreciate your interest and encourage you to explore other opportunities on Koneksi.\n\nKoneksi Team`;

  return { subject, html, text };
}

export function smtpTestEmail(
  host: string,
  port: number,
  secure: boolean,
  from: string
): { subject: string; html: string; text: string } {
  const subject = "Koneksi — SMTP test email";

  const bodyContent = `
    ${greeting("there")}
    ${paragraph("This is a test email confirming that your SMTP settings are configured correctly in Koneksi.")}
    ${divider()}
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      ${infoRow("Server:", `${host}:${port}`)}
      ${infoRow("Security:", secure ? "SSL/TLS" : "STARTTLS")}
      ${infoRow("From:", from)}
    </table>
    ${divider()}
    ${paragraph("If you received this email, your notification settings are working correctly. No further action is required.")}
  `;

  const html = baseLayout("SMTP Configuration Test", bodyContent, "This is an automated test email from Koneksi.");

  const text = `This is a test email from Koneksi.\n\nSMTP settings are working correctly.\n\nServer: ${host}:${port} (${secure ? "SSL/TLS" : "STARTTLS"})\nFrom: ${from}`;

  return { subject, html, text };
}
