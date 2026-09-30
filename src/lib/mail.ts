import "server-only";
import nodemailer from "nodemailer";

type StudentPasswordMail = {
  email: string;
  name: string;
  studentId: string;
  username?: string | null;
  temporaryPassword: string;
  schoolLabel?: string | null;
  reason: "welcome" | "reset";
};

function mailConfig() {
  const host = process.env.KC_MAIL_SMTP_HOST?.trim();
  const username = process.env.KC_MAIL_SMTP_USERNAME?.trim();
  const password = process.env.KC_MAIL_SMTP_PASSWORD;
  if (!host || !username || !password) return null;
  const port = Number(process.env.KC_MAIL_SMTP_PORT || 587);
  return {
    host,
    port,
    secure: port === 465,
    auth: { user: username, pass: password },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  };
}

function loginUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) return configured + "/login";
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return "https://" + process.env.VERCEL_PROJECT_PRODUCTION_URL + "/login";
  return "http://localhost:3000/login";
}

export function isPasswordEmailConfigured() {
  return mailConfig() !== null;
}

export async function sendStudentPasswordEmail(
  input: StudentPasswordMail,
): Promise<boolean> {
  const config = mailConfig();
  if (!config) return false;
  const school = input.schoolLabel?.trim() || "KnightCode";
  const fromAddress =
    process.env.KC_MAIL_FROM_ADDRESS?.trim() || config.auth.user;
  const fromName = process.env.KC_MAIL_FROM_NAME?.trim() || "KnightCode";
  const subject =
    input.reason === "welcome"
      ? "Your KnightCode account is ready"
      : "Your KnightCode password was reset";
  const lines = [
    "Hi " + input.name + ",",
    "",
    input.reason === "welcome"
      ? "Your KnightCode account has been created by your teacher at " +
        school +
        "."
      : "Your KnightCode password was reset by your teacher at " + school + ".",
    "",
    "Student ID: " + input.studentId,
  ];
  if (input.username) lines.push("Username: " + input.username);
  lines.push(
    "Email: " + input.email,
    "Temporary password: " + input.temporaryPassword,
    "",
    "Sign in at: " + loginUrl(),
    "Use your Student ID, username, or email with the temporary password above.",
    "After signing in, open Profile and change the temporary password in the Security section.",
    "",
    "- " + school,
  );
  try {
    const transporter = nodemailer.createTransport(config);
    await transporter.sendMail({
      from: { name: fromName, address: fromAddress },
      to: { name: input.name, address: input.email },
      subject,
      text: lines.join("\n"),
    });
    return true;
  } catch (error) {
    console.error(
      "KnightCode password email failed:",
      error instanceof Error ? error.message : "Unknown mail error",
    );
    return false;
  }
}
