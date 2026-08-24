import nodemailer from "nodemailer";

function makeTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: { user, pass },
  });
}

function verificationHtml(code: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>FirstPick Verification</title>
</head>
<body style="margin:0;padding:0;background:#000000;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#000000;padding:48px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#0d0d0d;border-radius:20px;border:1px solid rgba(255,255,255,0.08);">
  <tr>
    <td align="center" style="padding:44px 40px 28px;background:linear-gradient(180deg,rgba(255,102,0,0.08) 0%,transparent 100%);border-radius:20px 20px 0 0;">
      <div style="font-size:44px;font-weight:900;letter-spacing:-2px;font-family:Arial Black,Arial,sans-serif;line-height:1;">
        <span style="color:#ffffff;">FIRST</span><span style="color:#ff6600;">PICK</span>
      </div>
      <div style="margin-top:8px;color:rgba(255,255,255,0.3);font-size:11px;letter-spacing:3px;text-transform:uppercase;">Premium Streetwear &middot; Dubai</div>
    </td>
  </tr>
  <tr>
    <td style="padding:32px 40px 40px;">
      <h1 style="margin:0 0 10px;color:#ffffff;font-size:26px;font-weight:900;text-align:center;">Verify your email</h1>
      <p style="margin:0 0 32px;color:rgba(255,255,255,0.45);font-size:14px;text-align:center;line-height:1.65;">Enter this code in the app to finish creating your FirstPick account.</p>
      <div style="background:rgba(255,102,0,0.07);border:1.5px solid rgba(255,102,0,0.28);border-radius:16px;padding:32px 24px;text-align:center;margin-bottom:24px;">
        <div style="color:rgba(255,255,255,0.3);font-size:10px;letter-spacing:4px;text-transform:uppercase;margin-bottom:14px;">Your verification code</div>
        <div style="font-size:56px;font-weight:900;letter-spacing:16px;color:#ff6600;font-family:'Courier New',Courier,monospace;">${code}</div>
      </div>
      <p style="margin:0 0 6px;color:rgba(255,255,255,0.25);font-size:12px;text-align:center;">&#x23F1; This code expires in 10 minutes</p>
      <p style="margin:0;color:rgba(255,255,255,0.15);font-size:11px;text-align:center;">If you didn't try to register, you can safely ignore this email.</p>
    </td>
  </tr>
  <tr>
    <td style="padding:18px 40px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
      <p style="margin:0;color:rgba(255,255,255,0.18);font-size:11px;">&copy; 2025 FirstPick &middot; Dubai, UAE</p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/**
 * Send a verification code email. Returns true if sent, false if SMTP is not configured.
 * In non-production environments, the code is logged to the server console as a fallback.
 */
export async function sendVerificationEmail(to: string, code: string): Promise<boolean> {
  const transporter = makeTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@firstpick.ae";

  if (!transporter) {
    console.log(`\n[EMAIL] ⚠ SMTP not configured. Verification code for ${to}: ${code}\n`);
    return false;
  }

  try {
    await transporter.sendMail({
      from: `FirstPick <${from}>`,
      to,
      subject: `${code} is your FirstPick verification code`,
      html: verificationHtml(code),
    });
    console.log(`[EMAIL] Verification code sent to ${to}`);
    return true;
  } catch (err) {
    console.error("[EMAIL] Failed to send:", err);
    return false;
  }
}
