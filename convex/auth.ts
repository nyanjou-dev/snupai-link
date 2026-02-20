import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Email } from "@convex-dev/auth/providers/Email";

const ResendOTP = Email({
  id: "resend-otp",
  maxAge: 15 * 60,
  generateVerificationToken() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },
  async sendVerificationRequest({ identifier, token }: { identifier: string; token: string }) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("Missing RESEND_API_KEY environment variable");

    const from = process.env.RESEND_FROM_EMAIL ?? "snupai.link <noreply@snupai.link>";

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [identifier],
        subject: `${token} is your snupai.link verification code`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="color: #cba6f7; font-size: 24px; margin-bottom: 8px;">snupai<span style="color: #a6adc8">.link</span></h1>
            <p style="color: #bac2de; font-size: 16px; margin-bottom: 24px;">Here's your verification code:</p>
            <div style="background: #1e1e2e; border: 1px solid #313244; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <span style="font-family: 'SF Mono', 'Fira Code', monospace; font-size: 32px; letter-spacing: 8px; color: #cba6f7; font-weight: bold;">${token}</span>
            </div>
            <p style="color: #6c7086; font-size: 14px;">This code expires in 15 minutes. If you didn't request this, you can safely ignore this email.</p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Failed to send verification email: ${response.status} ${body}`);
    }
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      verify: ResendOTP,
      reset: ResendOTP,
    }),
  ],
});
