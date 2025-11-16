/**
 * Email Service
 *
 * @description Nodemailer를 사용한 이메일 발송 서비스
 */

import * as nodemailer from 'nodemailer';
import { log } from '../utils/logger';

/**
 * 이메일 전송 옵션 인터페이스
 */
export interface IEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured = false;

  constructor() {
    this.initializeTransporter();
  }

  /**
   * Nodemailer Transporter 초기화
   */
  private initializeTransporter(): void {
    try {
      const emailHost = process.env.EMAIL_HOST;
      const emailPort = process.env.EMAIL_PORT;
      const emailUser = process.env.EMAIL_USER;
      const emailPassword = process.env.EMAIL_PASSWORD;

      // 필수 환경 변수 확인
      if (!emailHost || !emailPort || !emailUser || !emailPassword) {
        log.warn('Email service not configured - missing environment variables');
        log.warn('Required: EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD');
        this.isConfigured = false;
        return;
      }

      // SMTP 트랜스포터 생성
      this.transporter = nodemailer.createTransport({
        host: emailHost,
        port: parseInt(emailPort, 10),
        secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: emailUser,
          pass: emailPassword,
        },
      });

      this.isConfigured = true;
      log.info('Email service initialized successfully', {
        host: emailHost,
        port: emailPort,
        user: emailUser,
      });
    } catch (error) {
      log.error('Failed to initialize email service', error);
      this.isConfigured = false;
    }
  }

  /**
   * 이메일 전송
   */
  async sendEmail(options: IEmailOptions): Promise<void> {
    if (!this.isConfigured || !this.transporter) {
      throw new Error(
        'Email service is not configured. Please check EMAIL_* environment variables.'
      );
    }

    try {
      const emailFrom = process.env.EMAIL_FROM || 'noreply@gonsai2.com';

      await this.transporter.sendMail({
        from: emailFrom,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      log.info('Email sent successfully', {
        to: options.to,
        subject: options.subject,
      });
    } catch (error) {
      log.error('Failed to send email', {
        to: options.to,
        subject: options.subject,
        error,
      });
      throw new Error('Failed to send email. Please try again later.');
    }
  }

  /**
   * 비밀번호 재설정 이메일 전송
   */
  async sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3002';
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>비밀번호 재설정</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f7;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f7; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 40px 40px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                🔐 비밀번호 재설정
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                안녕하세요,
              </p>
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                gonsai2 계정의 비밀번호 재설정을 요청하셨습니다.
              </p>
              <p style="margin: 0 0 30px; color: #333333; font-size: 16px; line-height: 1.6;">
                아래 버튼을 클릭하여 새로운 비밀번호를 설정하세요:
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 0 0 30px;">
                    <a href="${resetUrl}" style="display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
                      비밀번호 재설정
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 20px; color: #666666; font-size: 14px; line-height: 1.6;">
                또는 다음 링크를 복사하여 브라우저에 붙여넣으세요:
              </p>
              <p style="margin: 0 0 30px; padding: 15px; background-color: #f8f8f8; border-radius: 4px; color: #667eea; font-size: 14px; word-break: break-all;">
                ${resetUrl}
              </p>

              <div style="padding: 20px 0; border-top: 1px solid #eeeeee;">
                <p style="margin: 0 0 10px; color: #999999; font-size: 13px; line-height: 1.6;">
                  ⏱️ 이 링크는 <strong>1시간</strong> 동안만 유효합니다.
                </p>
                <p style="margin: 0; color: #999999; font-size: 13px; line-height: 1.6;">
                  ⚠️ 비밀번호 재설정을 요청하지 않으셨다면, 이 이메일을 무시하세요.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 30px 40px; background-color: #f8f8f8; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                © 2025 gonsai2. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const text = `
비밀번호 재설정

안녕하세요,

gonsai2 계정의 비밀번호 재설정을 요청하셨습니다.

다음 링크를 클릭하여 새로운 비밀번호를 설정하세요:
${resetUrl}

이 링크는 1시간 동안만 유효합니다.

비밀번호 재설정을 요청하지 않으셨다면, 이 이메일을 무시하세요.

© 2025 gonsai2. All rights reserved.
    `;

    await this.sendEmail({
      to,
      subject: '🔐 gonsai2 비밀번호 재설정',
      html,
      text,
    });
  }

  /**
   * 이메일 서비스 설정 상태 확인
   */
  isEmailServiceConfigured(): boolean {
    return this.isConfigured;
  }
}

// Singleton 인스턴스
export const emailService = new EmailService();
