import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter;
  private adminEmail: string;
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {
    const smtpHost = this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com');
    const smtpPort = this.configService.get<number>('SMTP_PORT', 587);
    const smtpSecure = this.configService.get<string>('SMTP_SECURE', 'false') === 'true';
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');
    
    this.logger.log(`Email config: host=${smtpHost}, port=${smtpPort}, secure=${smtpSecure}, user=${smtpUser}`);
    
    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
    this.adminEmail = this.configService.get<string>('ADMIN_EMAIL', 'admin@example.com');
    this.logger.log(`Admin email set to: ${this.adminEmail}`);
  }

  async sendPasswordResetEmail(email: string, resetUrl: string) {
    await this.transporter.sendMail({
      from: this.configService.get<string>('SMTP_FROM', 'noreply@blog.com'),
      to: email,
      subject: 'Password Reset Request',
      html: `
        <h1>Password Reset</h1>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>This link will expire in 1 hour.</p>
      `,
    });
  }

  async sendNewUserRegistrationNotification(user: {
    id: string;
    username: string;
    email: string;
    phone?: string;
    cvUrl?: string;
  }) {
    const adminPanelUrl = this.configService.get<string>('ADMIN_PANEL_URL', 'http://localhost:3001');
    const verifyUrl = `${adminPanelUrl}/users/${user.id}`;

    this.logger.log(`Sending registration notification to admin: ${this.adminEmail}`);
    
    const result = await this.transporter.sendMail({
      from: this.configService.get<string>('SMTP_FROM', 'noreply@blog.com'),
      to: this.adminEmail,
      subject: '🆕 New Author Registration - Verification Required',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">New Author Registration</h1>
          <p>A new author has registered and is awaiting verification. Please review their documents:</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Username:</strong> ${user.username}</p>
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Phone:</strong> ${user.phone || 'Not provided'}</p>
            <p><strong>User ID:</strong> ${user.id}</p>
            ${user.cvUrl ? `<p><strong>CV Document:</strong> <a href="${user.cvUrl}" style="color: #2196F3;">Download CV</a></p>` : '<p><strong>CV Document:</strong> Not uploaded</p>'}
          </div>
          
          <p>Please review the author's credentials and CV in the admin panel:</p>
          <a href="${verifyUrl}" style="display: inline-block; background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 0;">
            Review Author
          </a>
          
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            This is an automated notification from The World Ambassador.
          </p>
        </div>
      `,
    });
    
    this.logger.log(`✅ Admin notification sent. Message ID: ${result.messageId}`);
  }

  async sendUserVerifiedNotification(user: { email: string; username: string }) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    await this.transporter.sendMail({
      from: this.configService.get<string>('SMTP_FROM', 'noreply@blog.com'),
      to: user.email,
      subject: '🎉 Congratulations! Your Author Account Has Been Approved - The World Ambassador',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #4CAF50, #2E7D32); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 28px;">🎉 Congratulations!</h1>
            <p style="color: #E8F5E9; margin: 10px 0 0; font-size: 16px;">Your Author Account Has Been Approved</p>
          </div>
          
          <div style="padding: 30px; background: #fff; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; color: #333;">Dear ${user.username},</p>
            <p style="font-size: 15px; color: #555; line-height: 1.6;">
              We are delighted to inform you that your author account at <strong>The World Ambassador</strong> has been reviewed and approved by our editorial team.
            </p>
            <p style="font-size: 15px; color: #555; line-height: 1.6;">
              You can now log in to your account and start contributing articles to our platform. We look forward to your valuable contributions!
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${frontendUrl}/en/login" style="display: inline-block; background: #4CAF50; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">
                Log In to Your Account
              </a>
            </div>
            
            <p style="font-size: 13px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; text-align: center;">
              Welcome to The World Ambassador family!<br/>
              This is an automated email. Please do not reply directly.
            </p>
          </div>
        </div>
      `,
    });
  }

  async sendRegistrationConfirmationToAuthor(user: {
    email: string;
    username: string;
  }) {
    await this.transporter.sendMail({
      from: this.configService.get<string>('SMTP_FROM', 'noreply@blog.com'),
      to: user.email,
      subject: 'Registration Received - The World Ambassador',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1976D2, #0D47A1); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 24px;">Registration Received</h1>
          </div>
          
          <div style="padding: 30px; background: #fff; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; color: #333;">Dear ${user.username},</p>
            <p style="font-size: 15px; color: #555; line-height: 1.6;">
              Thank you for registering as an author at <strong>The World Ambassador</strong>. We have received your application along with your submitted documents.
            </p>
            <p style="font-size: 15px; color: #555; line-height: 1.6;">
              Our editorial team will review your credentials and CV. You will receive a notification email once your account has been approved.
            </p>
            
            <div style="background: #E3F2FD; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1976D2;">
              <p style="margin: 0; color: #1565C0; font-size: 14px;">
                <strong>What happens next?</strong><br/>
                Our team will review your profile and documents. This usually takes 1-2 business days. You will receive an email notification once your account is approved.
              </p>
            </div>
            
            <p style="font-size: 13px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; text-align: center;">
              The World Ambassador<br/>
              This is an automated email. Please do not reply directly.
            </p>
          </div>
        </div>
      `,
    });
  }

  async sendNewPostSubmissionNotification(post: {
    id: string;
    title: string;
    authorName: string;
    authorEmail: string;
  }) {
    const adminPanelUrl = this.configService.get<string>('ADMIN_PANEL_URL', 'http://localhost:3001');
    const verifyUrl = `${adminPanelUrl}/posts/${post.id}`;

    await this.transporter.sendMail({
      from: this.configService.get<string>('SMTP_FROM', 'noreply@blog.com'),
      to: this.adminEmail,
      subject: '📝 New Post Submission - Review Required',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">New Post Submission</h1>
          <p>A new post has been submitted and is awaiting approval:</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Title:</strong> ${post.title}</p>
            <p><strong>Author:</strong> ${post.authorName}</p>
            <p><strong>Author Email:</strong> ${post.authorEmail}</p>
            <p><strong>Post ID:</strong> ${post.id}</p>
          </div>
          
          <p>Please review and approve this post in the admin panel:</p>
          <a href="${verifyUrl}" style="display: inline-block; background: #FF9800; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 0;">
            Review Post
          </a>
          
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            This is an automated notification from your blog system.
          </p>
        </div>
      `,
    });
  }

  async sendPostApprovedNotification(post: {
    title: string;
    slug: string;
    authorEmail: string;
    authorName: string;
  }) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const postUrl = `${frontendUrl}/post/${post.slug}`;

    await this.transporter.sendMail({
      from: this.configService.get<string>('SMTP_FROM', 'noreply@blog.com'),
      to: post.authorEmail,
      subject: '✅ Your Post Has Been Approved',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #4CAF50;">Post Approved!</h1>
          <p>Hello ${post.authorName},</p>
          <p>Great news! Your post "<strong>${post.title}</strong>" has been approved and is now published.</p>
          
          <a href="${postUrl}" style="display: inline-block; background: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">
            View Your Post
          </a>
          
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            Thank you for your contribution!
          </p>
        </div>
      `,
    });
  }

  async sendPostRejectedNotification(post: {
    title: string;
    authorEmail: string;
    authorName: string;
    reason?: string;
  }) {
    await this.transporter.sendMail({
      from: this.configService.get<string>('SMTP_FROM', 'noreply@blog.com'),
      to: post.authorEmail,
      subject: '❌ Your Post Was Not Approved',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #f44336;">Post Not Approved</h1>
          <p>Hello ${post.authorName},</p>
          <p>Unfortunately, your post "<strong>${post.title}</strong>" was not approved for publication.</p>
          
          ${post.reason ? `
          <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff9800;">
            <p><strong>Reason:</strong> ${post.reason}</p>
          </div>
          ` : ''}
          
          <p>You can edit your post and resubmit it for review.</p>
          
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            If you have questions, please contact the administrator.
          </p>
        </div>
      `,
    });
  }
}
