const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
};

/**
 * Send a password reset email with a reset link.
 * If SMTP is not configured (development), logs the link to console instead.
 */
const sendPasswordResetEmail = async (toEmail, resetToken) => {
  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('--------------------------------------------------');
    console.log('SMTP not configured. Password reset link (dev mode):');
    console.log(resetLink);
    console.log('--------------------------------------------------');
    return;
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: toEmail,
    subject: 'Nation Builders Institute of Learning Larkana - Password Reset',
    html: `
      <p>You requested a password reset.</p>
      <p>Click the link below to reset your password. This link expires in 1 hour.</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>If you did not request this, please ignore this email.</p>
    `,
  };

  await getTransporter().sendMail(mailOptions);
};

module.exports = { sendPasswordResetEmail };
