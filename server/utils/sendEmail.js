import nodemailer from 'nodemailer';

// Create reusable transporter object
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_EMAIL,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendPasswordResetEmail(email, resetLink) {
  try {
    const mailOptions = {
      from: process.env.GMAIL_EMAIL,
      to: email,
      subject: 'Password Reset Request - Attendance Portal',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #003E8E; padding: 20px; text-align: center;">
            <h2 style="color: white; margin: 0;">NIELIT Attendance Portal</h2>
          </div>
          <div style="padding: 20px;">
            <p>Hello,</p>
            <p>We received a request to reset your password. Click the button below to set a new password.</p>
            <p style="margin: 30px 0;">
              <a href="${resetLink}" style="background-color: #2E7D32; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Reset Password
              </a>
            </p>
            <p>Or copy this link: <br/><code style="background-color: #f5f5f5; padding: 10px; display: inline-block;">${resetLink}</code></p>
            <p style="color: #666; font-size: 12px;">
              <strong>Important:</strong> This link will expire in 1 hour for security reasons.
            </p>
            <p style="color: #666; font-size: 12px;">
              If you didn't request a password reset, please ignore this email or contact support.
            </p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">NIELIT Attendance System</p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.response);
    return { ok: true, message: 'Password reset email sent successfully' };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { ok: false, error: error.message };
  }
}
