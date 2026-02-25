import * as dotenv from 'dotenv';
dotenv.config();
import * as nodemailer from 'nodemailer';

async function testEmail() {
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
  const smtpSecure = process.env.SMTP_SECURE === 'true';
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const adminEmail = process.env.ADMIN_EMAIL;
  
  console.log('Email Configuration:');
  console.log('- Host:', smtpHost);
  console.log('- Port:', smtpPort);
  console.log('- Secure:', smtpSecure);
  console.log('- User:', smtpUser);
  console.log('- Admin Email:', adminEmail);
  
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
  
  console.log('\nVerifying transporter connection...');
  
  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified!');
  } catch (error) {
    console.error('❌ SMTP connection failed:', error);
    return;
  }
  
  console.log('\nSending test email to admin...');
  
  try {
    const result = await transporter.sendMail({
      from: process.env.SMTP_FROM || smtpUser,
      to: adminEmail,
      subject: '🧪 Test Email - Admin Verification System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #4CAF50;">Email System Test</h1>
          <p>This is a test email to verify that the admin notification system is working correctly.</p>
          <p>If you receive this email, the email configuration is set up properly!</p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            Sent at: ${new Date().toISOString()}
          </p>
        </div>
      `,
    });
    console.log('✅ Email sent successfully!');
    console.log('Message ID:', result.messageId);
  } catch (error) {
    console.error('❌ Failed to send email:', error);
  }
}

testEmail();
