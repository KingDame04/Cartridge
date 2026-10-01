const sgMail = require('@sendgrid/mail');

// Initializes SendGrid using your .env API Key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Sends a registration verification email via SendGrid SDK
 * @param {string} to - The user's target email address
 * @param {string} token - The unique verification token
 */

const sendVerificationEmail = async (userEmail, token) => {
    const verifiedSender =  process.env.SENDGRID_FROM_EMAIL?.trim().toLowerCase();
    
    const verificationLink = `${process.env.APP_BASE_URL}/api/auth/verifyEmail?token=${token}`;

    const msg = {
        to: userEmail,
        from: verifiedSender, 
        subject: 'Verify your CARTRIDGE Account',
        text: `Welcome to CARTRIDGE! Verify your email here: ${verificationLink}`,
        html: `<strong>Welcome to CARTRIDGE!</strong><br><br><a href="${verificationLink}">Click here to verify your account</a>`,
    };

    try {
        await sgMail.send(msg);
        console.log(`Verification email successfully sent to ${userEmail}`);
    } catch (error) {
        console.error("SendGrid SDK Error Details:", error.response?.body || error.message);
        throw new Error("Email delivery failed");
    }
};

// Function that handles password resets
const sendPasswordResetEmail = async (userEmail, token) => {
    const verifiedSender =   process.env.SENDGRID_FROM_EMAIL?.trim().toLowerCase(); 

    const resetLink = `${process.env.APP_BASE_URL}/reset-password?token=${token}`;
    
    const msg = {
        to: userEmail,
        from: verifiedSender, 
        subject: 'Password Reset Request',
        text: `You've requested to reset your password`,
        html: `<p>Here's the link you requested to reset your password:<p>
               <a href="${resetLink}"> RESET PASSWORD</a>
               <p>This link will expire in 10 minutes</p>`
    };

    try {
        await sgMail.send(msg);
        console.log(`Password reset request successfully sent to ${userEmail}`);
    } catch (error) {
        console.error("SendGrid SDK Error Details:", error.response?.body || error.message);
        throw new Error("Password reset email delivery failed");
    }
};

module.exports = {
    sendVerificationEmail,
    sendPasswordResetEmail
};

