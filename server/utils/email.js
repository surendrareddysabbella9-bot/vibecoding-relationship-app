const nodemailer = require('nodemailer');

// Create transporter using Gmail
const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS // Use App Password, not regular password
        }
    });
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetUrl, userName) => {
    const transporter = createTransporter();

    const mailOptions = {
        from: `"VibeSync" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '🔐 Reset Your VibeSync Password',
        html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #e11d48, #4f46e5); padding: 30px; border-radius: 20px 20px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">✨ VibeSync</h1>
                    <p style="color: rgba(255,255,255,0.9); margin-top: 10px;">Your Relationship Companion</p>
                </div>
                
                <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 20px 20px; border: 1px solid #e5e7eb; border-top: none;">
                    <h2 style="color: #1f2937; margin-top: 0;">Hey ${userName || 'there'}! 👋</h2>
                    
                    <p style="color: #4b5563; line-height: 1.6;">
                        We received a request to reset your password. No worries, it happens to the best of us!
                    </p>
                    
                    <p style="color: #4b5563; line-height: 1.6;">
                        Click the button below to create a new password:
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" style="background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; padding: 15px 40px; border-radius: 10px; text-decoration: none; font-weight: bold; display: inline-block; box-shadow: 0 4px 15px rgba(79, 70, 229, 0.3);">
                            Reset Password
                        </a>
                    </div>
                    
                    <p style="color: #9ca3af; font-size: 14px; line-height: 1.6;">
                        ⏰ This link expires in <strong>10 minutes</strong> for security reasons.
                    </p>
                    
                    <p style="color: #9ca3af; font-size: 14px; line-height: 1.6;">
                        If you didn't request this, you can safely ignore this email. Your password won't change.
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                    
                    <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                        Made with ❤️ by VibeSync Team
                    </p>
                </div>
            </div>
        `
    };

    await transporter.sendMail(mailOptions);
};

// Send daily reminder email
const sendDailyReminderEmail = async (email, userName, taskTitle) => {
    const transporter = createTransporter();

    const mailOptions = {
        from: `"VibeSync" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `💕 ${userName}, your daily vibe awaits!`,
        html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #e11d48, #4f46e5); padding: 30px; border-radius: 20px 20px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">✨ VibeSync</h1>
                    <p style="color: rgba(255,255,255,0.9); margin-top: 10px;">Daily Connection Reminder</p>
                </div>
                
                <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 20px 20px; border: 1px solid #e5e7eb; border-top: none;">
                    <h2 style="color: #1f2937; margin-top: 0;">Hey ${userName}! 👋</h2>
                    
                    <p style="color: #4b5563; line-height: 1.6;">
                        Your daily connection task is waiting for you and your partner!
                    </p>
                    
                    <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 20px; border-radius: 15px; margin: 20px 0;">
                        <p style="color: rgba(255,255,255,0.8); margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Today's Prompt</p>
                        <h3 style="color: white; margin: 0; font-size: 20px;">${taskTitle}</h3>
                    </div>
                    
                    <p style="color: #4b5563; line-height: 1.6;">
                        Take a moment to connect with your partner today. Small moments build big memories! 💜
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.FRONTEND_URL}/dashboard" style="background: linear-gradient(135deg, #e11d48, #f43f5e); color: white; padding: 15px 40px; border-radius: 10px; text-decoration: none; font-weight: bold; display: inline-block; box-shadow: 0 4px 15px rgba(225, 29, 72, 0.3);">
                            Open VibeSync
                        </a>
                    </div>
                    
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                    
                    <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                        You're receiving this because you enabled daily reminders. 
                        <a href="${process.env.FRONTEND_URL}/dashboard" style="color: #4f46e5;">Manage preferences</a>
                    </p>
                </div>
            </div>
        `
    };

    await transporter.sendMail(mailOptions);
};

module.exports = {
    sendPasswordResetEmail,
    sendDailyReminderEmail
};
