import { emailSendingReady } from "./emailConfig";
import { sendViaSmtp } from "./smtpSend";

/** Sign-up and password emails, sent through the app's own SMTP server. Backend only. */
const sendAuthEmail = async ({ to, subject, title, body, actionLabel, actionUrl }: { to: string; subject: string; title: string; body: string; actionLabel: string; actionUrl: string }) => {
  if (!(await emailSendingReady())) throw new Error("The app's email server is not set up yet.");
  const text = title + "\n\n" + body + "\n\n" + actionLabel + ": " + actionUrl + "\n\nIf you did not request this, you can ignore this email.";
  const html =
    '<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#18231f"><h1 style="font-size:24px;margin:0 0 16px">' +
    title +
    '</h1><p style="line-height:1.6">' +
    body +
    '</p><p><a href="' +
    actionUrl +
    '" style="display:inline-block;padding:12px 18px;background:#0e5c3f;color:#fff;text-decoration:none;border-radius:8px">' +
    actionLabel +
    '</a></p><p style="font-size:13px;color:#6b746f;line-height:1.5">If you did not request this, you can ignore this email.</p></div>';
  const [result] = await sendViaSmtp([{ fromName: "Oni247", to, subject, html, text }]);
  if (!result.ok) throw new Error(result.error);
};
export default sendAuthEmail;

