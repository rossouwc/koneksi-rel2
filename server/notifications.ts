import nodemailer from "nodemailer";
import { db } from "./db";
import { systemSettings, notificationLog } from "@shared/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

async function getSystemSettingsMap(): Promise<Record<string, string>> {
  const rows = await db.select().from(systemSettings);
  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value;
  return map;
}

async function getNotificationMode(): Promise<{ mode: string; testEmail: string; testPhone: string }> {
  const map = await getSystemSettingsMap();
  return {
    mode: map["notification_mode"] || "test",
    testEmail: map["test_email"] || "rossouw@hoolio.co.za",
    testPhone: map["test_phone"] || "0828224487",
  };
}

async function getSmtpConfig(): Promise<{
  host: string | undefined;
  port: number;
  user: string | undefined;
  pass: string | undefined;
  from: string;
  secure: boolean;
}> {
  const map = await getSystemSettingsMap();
  const host = map["smtp_host"] || process.env.SMTP_HOST;
  const port = parseInt(map["smtp_port"] || process.env.SMTP_PORT || "587");
  const user = map["smtp_user"] || process.env.SMTP_USER;
  const pass = map["smtp_pass"] || process.env.SMTP_PASS;
  const from = map["smtp_from"] || process.env.SMTP_FROM || user || "noreply@koneksi.app";
  const secure = map["smtp_secure"] === "true" || port === 465;
  return { host, port, user, pass, from, secure };
}

async function logNotification(
  type: string,
  recipient: string,
  subject: string | null,
  body: string,
  status: string
) {
  try {
    await db.insert(notificationLog).values({
      id: randomUUID(),
      type,
      recipient,
      subject,
      body,
      status,
    });
  } catch (e) {
    console.error("[notifications] Failed to log notification:", e);
  }
}

export async function sendEmail(
  to: string,
  subject: string,
  body: string
): Promise<void> {
  const { mode, testEmail } = await getNotificationMode();
  const actualTo = mode === "test" ? testEmail : to;

  const { host, port, user, pass, from, secure } = await getSmtpConfig();

  if (!host || !user || !pass) {
    console.log(`[notifications] Email suppressed (no SMTP config). To: ${actualTo}, Subject: ${subject}`);
    await logNotification("email", actualTo, subject, body, "suppressed");
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    await transporter.sendMail({ from, to: actualTo, subject, text: body });
    console.log(`[notifications] Email sent to ${actualTo}`);
    await logNotification("email", actualTo, subject, body, "sent");
  } catch (err: any) {
    console.error(`[notifications] Email failed:`, err.message);
    await logNotification("email", actualTo, subject, body, `failed: ${err.message}`);
  }
}

export async function sendSms(to: string, message: string): Promise<void> {
  const { mode, testPhone } = await getNotificationMode();
  const actualTo = mode === "test" ? testPhone : to;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.log(`[notifications] SMS suppressed (no Twilio config). To: ${actualTo}, Message: ${message}`);
    await logNotification("sms", actualTo, null, message, "suppressed");
    return;
  }

  try {
    const twilio = (await import("twilio")).default;
    const client = twilio(accountSid, authToken);
    await client.messages.create({ body: message, from: fromNumber, to: actualTo });
    console.log(`[notifications] SMS sent to ${actualTo}`);
    await logNotification("sms", actualTo, null, message, "sent");
  } catch (err: any) {
    console.error(`[notifications] SMS failed:`, err.message);
    await logNotification("sms", actualTo, null, message, `failed: ${err.message}`);
  }
}

export async function testSmtpConnection(toOverride?: string): Promise<{ success: boolean; message: string }> {
  const { host, port, user, pass, from, secure } = await getSmtpConfig();

  if (!host || !user || !pass) {
    return { success: false, message: "SMTP not configured. Please enter host, username and password first." };
  }

  const { testEmail } = await getNotificationMode();
  const to = toOverride || testEmail;

  try {
    const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
    await transporter.verify();
    await transporter.sendMail({
      from,
      to,
      subject: "Koneksi — SMTP test email",
      text: `This is a test email from Koneksi.\n\nSMTP settings are working correctly.\n\nServer: ${host}:${port} (${secure ? "SSL/TLS" : "STARTTLS"})\nFrom: ${from}`,
    });
    await logNotification("email", to, "Koneksi — SMTP test email", "Test email", "sent");
    return { success: true, message: `Test email sent successfully to ${to}` };
  } catch (err: any) {
    return { success: false, message: err.message || "Failed to send test email" };
  }
}
