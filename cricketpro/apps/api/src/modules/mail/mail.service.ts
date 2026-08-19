import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import { SettingsService } from "../settings/setttings.service";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly settingsService: SettingsService) {}

  private async getTransporter() {
    const settings = await this.settingsService.get();

    if (!settings.emailEnabled || !settings.smtpHost || !settings.smtpUsername || !settings.smtpPassword) {
      return null; // email disabled or not configured — caller should skip silently
    }

    return nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort ?? 587,
      secure: (settings.smtpPort ?? 587) === 465, // true for port 465, false for 587/others
      auth: {
        user: settings.smtpUsername,
        pass: settings.smtpPassword,
      },
    });
  }

  async sendWelcomeEmail(to: string, name: string, plainPassword: string) {
    try {
      const transporter = await this.getTransporter();
      if (!transporter) {
        this.logger.warn(`Email not sent to ${to} — SMTP not configured/enabled`);
        return;
      }

      const settings = await this.settingsService.get();
      const fromAddress = settings.emailFromAddress || settings.smtpUsername;

      await transporter.sendMail({
        from: `"${settings.siteName || "CrickPro"}" <${fromAddress}>`,
        to,
        subject: `Welcome to ${settings.siteName || "CrickPro"} — Your Account Details`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #111;">
            <h2 style="margin-bottom: 4px;">Welcome, ${name}!</h2>
            <p style="color: #555;">An account has been created for you on ${settings.siteName || "CrickPro"}. Here are your login details:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr><td style="padding: 8px 0; color: #555;">Email</td><td style="padding: 8px 0; font-weight: 600;">${to}</td></tr>
              <tr><td style="padding: 8px 0; color: #555;">Password</td><td style="padding: 8px 0; font-weight: 600;">${plainPassword}</td></tr>
            </table>
            <p style="color: #d97706; font-size: 13px;">For your security, please log in and change your password as soon as possible.</p>
          </div>
        `,
      });
      this.logger.log(`Welcome email sent to ${to}`);
    } catch (err) {
      // Never let a mail failure break account creation.
      this.logger.error(`Failed to send welcome email to ${to}`, err instanceof Error ? err.stack : String(err));
    }
  }
}