jest.mock('@sendgrid/mail', () => ({
    setApiKey: jest.fn(),
    send: jest.fn()
}));

const sgMail = require('@sendgrid/mail');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../../src/utils/email');

describe('email utils', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.SENDGRID_FROM_EMAIL = 'noreply@cartridgeapp.fun';
        process.env.APP_BASE_URL = 'https://cartridgeapp.fun';
    });

    describe('sendVerificationEmail', () => {
        test('sends a message to the given address with a verification link containing the token', async () => {
            sgMail.send.mockResolvedValueOnce();

            await sendVerificationEmail('player@example.com', 'abc123token');

            expect(sgMail.send).toHaveBeenCalledTimes(1);
            const msg = sgMail.send.mock.calls[0][0];
            expect(msg.to).toBe('player@example.com');
            expect(msg.from).toBe('noreply@cartridgeapp.fun');
            expect(msg.html).toContain('abc123token');
            expect(msg.text).toContain('abc123token');
        });

        test('throws a generic error when SendGrid rejects the send', async () => {
            sgMail.send.mockRejectedValueOnce(new Error('SendGrid down'));

            await expect(
                sendVerificationEmail('player@example.com', 'abc123token')
            ).rejects.toThrow('Email delivery failed');
        });
    });

    describe('sendPasswordResetEmail', () => {
        test('sends a message to the given address with a reset link containing the token', async () => {
            sgMail.send.mockResolvedValueOnce();

            await sendPasswordResetEmail('player@example.com', 'reset456token');

            expect(sgMail.send).toHaveBeenCalledTimes(1);
            const msg = sgMail.send.mock.calls[0][0];
            expect(msg.to).toBe('player@example.com');
            expect(msg.from).toBe('noreply@cartridgeapp.fun');
            expect(msg.html).toContain('reset456token');
        });

        test('throws a generic error when SendGrid rejects the send', async () => {
            sgMail.send.mockRejectedValueOnce(new Error('SendGrid down'));

            await expect(
                sendPasswordResetEmail('player@example.com', 'reset456token')
            ).rejects.toThrow('Password reset email delivery failed');
        });
    });
});
