import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT),
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
      },
    });
  }

  async sendVerificationOtp(email: string, otp: string) {
    await this.transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: email,
      subject: 'Verify your email',
      html: `
        <h1>Email Verification</h1>
        <p>Your OTP is: <strong>${otp}</strong></p>
        <p>This code will expire in 5 minutes.</p>
      `,
    });
  }

  async sendPasswordResetOtp(email: string, otp: string) {
    await this.transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: email,
      subject: 'Reset your password',
      html: `
        <h1>Password Reset</h1>
        <p>Your OTP is: <strong>${otp}</strong></p>
        <p>This code will expire in 5 minutes.</p>
      `,
    });
  }
}
