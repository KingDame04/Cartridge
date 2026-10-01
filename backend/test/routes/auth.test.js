jest.mock('../../src/utils/email', () => ({
    sendVerificationEmail: jest.fn().mockResolvedValue(),
    sendPasswordResetEmail: jest.fn().mockResolvedValue()
}));

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const User = require('../../src/models/users');
const { hashPassword } = require('../../src/utils/hash');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../../src/utils/email');

// Every test user in this suite uses this domain so cleanup can find them
// all with a single query, regardless of which test created them.
const TEST_DOMAIN = 'authtest.cartridgeapp.fun';
const uniqueEmail = (label) => `${label}-${new mongoose.Types.ObjectId()}@${TEST_DOMAIN}`;

// main picked up server-side password complexity enforcement (register,
// resetPassword, and account's password-change branch all now require
// 8-14 chars with upper/lower/digit/special) — every password that goes
// through one of those endpoints in this file needs to satisfy it.
const COMPLIANT_PASSWORD = 'Passw0rd!';

const testUser = {
    username: 'NotARealGamer',
    email: 'NotARealGamer@cartridgeapp.fun',
    password: COMPLIANT_PASSWORD
};

beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
});

afterEach(() => {
    jest.clearAllMocks();
});

afterAll(async () => {
    await User.deleteMany({ email: testUser.email });
    await User.deleteMany({ email: { $regex: `@${TEST_DOMAIN}$` } });
    await mongoose.connection.close();
});

describe('Authentication Flow Suite', () => {
    // REGISTER ROUTE
    it('should register a brand new account successfully', async() => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                username: testUser.username,
                email: testUser.email,
                password: testUser.password,
                confirmPassword: testUser.password
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.message).toBe('Account added to DB.');

        const dbUser = await User.findOne({ email: testUser.email });
        expect(dbUser).toBeTruthy();
        expect(dbUser.isVerified).toBe(false); // Initial state of user on sign up, not email verified yet
        //expect(dbUser.isVerified).toBe(true); // true to test login
    });

    // Login Route
    it('Should log a user in if they have an email in the database and password matches, will not allow login otherwise', async() =>{
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: testUser.email,
                password: testUser.password
            });

        expect(res.statusCode).toEqual(403);
        expect(res.body).toHaveProperty('success', false);
        expect(res.body.message).toContain('Your account has not yet been verified. A new verification link has been sent.'); //Token for logout test
    });

    // Logout route
    it('Should log a user out and clear application state', async() => {
        const res = await request(app)
            .post('/api/auth/logout');

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe('Logout Successful');
    });

    describe('register validation', () => {
        it('rejects a request missing required fields', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({ username: 'Someone', email: uniqueEmail('missing') });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe('Please fill out all fields');
        });

        it('rejects a duplicate username (case-insensitive)', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    username: testUser.username.toUpperCase(),
                    email: uniqueEmail('dupuser'),
                    password: COMPLIANT_PASSWORD,
                    confirmPassword: COMPLIANT_PASSWORD
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe('Username already taken! Please try again.');
        });

        it('rejects a duplicate email', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'BrandNewUsername',
                    email: testUser.email,
                    password: COMPLIANT_PASSWORD,
                    confirmPassword: COMPLIANT_PASSWORD
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe('Account already exists. Please sign in.');
        });

        it('rejects mismatched passwords', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'MismatchUser',
                    email: uniqueEmail('mismatch'),
                    password: 'password123',
                    confirmPassword: 'password456'
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe('Passwords do NOT match');
        });
    });

    describe('login validation', () => {
        it('rejects a request missing email or password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: testUser.email });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe('Please enter your email and password.');
        });

        it('rejects an email with no matching account', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: uniqueEmail('nobody'), password: 'password123' });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe('Email/Password incorrect');
        });

        it('rejects an incorrect password for a real account', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: testUser.email, password: 'totallyWrongPassword' });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe('Email/Password incorrect');
        });

        it('logs a verified user in and returns a usable token', async () => {
            const email = uniqueEmail('verified-login');
            await User.create({
                username: `VerifiedLogin${new mongoose.Types.ObjectId()}`,
                email,
                passwordHash: await hashPassword('CorrectHorse1'),
                isVerified: true
            });

            const res = await request(app)
                .post('/api/auth/login')
                .send({ email, password: 'CorrectHorse1' });

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('Login successful.');
            expect(typeof res.body.token).toBe('string');
            expect(res.body.user.email).toBe(email.toLowerCase());
        });
    });

    describe('verifyEmail', () => {
        it('rejects a missing token', async () => {
            const res = await request(app).get('/api/auth/verifyEmail');

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe('Verfication token is missing.');
        });

        it('rejects an invalid token', async () => {
            const res = await request(app)
                .get('/api/auth/verifyEmail')
                .query({ token: 'not-a-real-token' });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe('Invalid or expired verfication token');
        });

        it('verifies a freshly registered account using its real verification token', async () => {
            const email = uniqueEmail('toverify');
            const registerRes = await request(app)
                .post('/api/auth/register')
                .send({
                    username: `ToVerify${new mongoose.Types.ObjectId()}`,
                    email,
                    password: COMPLIANT_PASSWORD,
                    confirmPassword: COMPLIANT_PASSWORD
                });
            expect(registerRes.statusCode).toBe(201);

            const dbUser = await User.findOne({ email: email.toLowerCase() });
            const res = await request(app)
                .get('/api/auth/verifyEmail')
                .query({ token: dbUser.verificationToken });

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('Email verified! Welcome to CARTRIDGE. You may now sign in!');

            const verifiedUser = await User.findOne({ email: email.toLowerCase() });
            expect(verifiedUser.isVerified).toBe(true);
            expect(verifiedUser.verificationToken).toBeUndefined();
        });
    });

    describe('resendEmailVerification', () => {
        it('rejects a blank email', async () => {
            const res = await request(app)
                .post('/api/auth/resendEmailVerification')
                .send({ email: '  ' });

            expect(res.statusCode).toBe(400);
        });

        it('responds 200 without leaking whether the account exists', async () => {
            const res = await request(app)
                .post('/api/auth/resendEmailVerification')
                .send({ email: uniqueEmail('nobody-resend') });

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('Email verification link sent.');
        });

        it('rejects an already-verified account', async () => {
            const email = uniqueEmail('already-verified');
            await User.create({
                username: `AlreadyVerified${new mongoose.Types.ObjectId()}`,
                email,
                passwordHash: await hashPassword('password123'),
                isVerified: true
            });

            const res = await request(app)
                .post('/api/auth/resendEmailVerification')
                .send({ email });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe('Account already verified. Please LOG IN.');
        });

        it('issues a fresh verification token for an unverified account', async () => {
            const email = uniqueEmail('resend-unverified');
            const user = await User.create({
                username: `ResendUnverified${new mongoose.Types.ObjectId()}`,
                email,
                passwordHash: await hashPassword('password123'),
                isVerified: false,
                verificationToken: 'stale-token'
            });

            const res = await request(app)
                .post('/api/auth/resendEmailVerification')
                .send({ email });

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('A new verification link has been sent to your inbox!');
            expect(sendVerificationEmail).toHaveBeenCalledTimes(1);

            const updated = await User.findById(user._id);
            expect(updated.verificationToken).not.toBe('stale-token');
        });
    });

    describe('forgotPassword', () => {
        it('rejects a missing email', async () => {
            const res = await request(app).post('/api/auth/forgotPassword').send({});

            expect(res.statusCode).toBe(400);
        });

        it('responds 200 without leaking whether the account exists', async () => {
            const res = await request(app)
                .post('/api/auth/forgotPassword')
                .send({ email: uniqueEmail('nobody-forgot') });

            expect(res.statusCode).toBe(200);
            expect(sendPasswordResetEmail).not.toHaveBeenCalled();
        });

        it('generates and emails a reset token for a real account', async () => {
            const email = uniqueEmail('forgot-real');
            await User.create({
                username: `ForgotReal${new mongoose.Types.ObjectId()}`,
                email,
                passwordHash: await hashPassword('password123'),
                isVerified: true
            });

            const res = await request(app)
                .post('/api/auth/forgotPassword')
                .send({ email });

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);

            const updated = await User.findOne({ email: email.toLowerCase() });
            expect(updated.resetPasswordToken).toBeTruthy();
            expect(updated.resetPasswordExpires).toBeTruthy();
        });
    });

    describe('resetPassword', () => {
        it('rejects missing fields', async () => {
            const res = await request(app)
                .post('/api/auth/resetPassword')
                .query({ token: 'sometoken' })
                .send({ newPassword: 'newPass123' });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe('Missing required reset fields.');
        });

        it('rejects mismatched new passwords', async () => {
            const res = await request(app)
                .post('/api/auth/resetPassword')
                .query({ token: 'sometoken' })
                .send({ newPassword: 'newPass123', confirmNewPassword: 'differentPass456' });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe('Passwords do NOT match! Please try again.');
        });

        it('rejects an invalid or expired token', async () => {
            const res = await request(app)
                .post('/api/auth/resetPassword')
                .query({ token: 'not-a-real-token' })
                .send({ newPassword: 'newPass123', confirmNewPassword: 'newPass123' });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe('Invalid or expired reset token.');
        });

        it('rejects a new password matching the old one', async () => {
            const email = uniqueEmail('reset-samepass');
            const user = await User.create({
                username: `ResetSamePass${new mongoose.Types.ObjectId()}`,
                email,
                passwordHash: await hashPassword('OldPass1!'),
                isVerified: true,
                resetPasswordToken: 'valid-reset-token',
                resetPasswordExpires: Date.now() + 600000
            });

            const res = await request(app)
                .post('/api/auth/resetPassword')
                .query({ token: 'valid-reset-token' })
                .send({ newPassword: 'OldPass1!', confirmNewPassword: 'OldPass1!' });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe('Your new password CANNOT match your previous password.');
        });

        it('resets the password with a valid token', async () => {
            const email = uniqueEmail('reset-success');
            const user = await User.create({
                username: `ResetSuccess${new mongoose.Types.ObjectId()}`,
                email,
                passwordHash: await hashPassword('OldPassword1'),
                isVerified: true,
                resetPasswordToken: 'another-valid-token',
                resetPasswordExpires: Date.now() + 600000
            });

            const res = await request(app)
                .post('/api/auth/resetPassword')
                .query({ token: 'another-valid-token' })
                .send({ newPassword: 'NewPass1!', confirmNewPassword: 'NewPass1!' });

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('Password updated! You may now log into your account.');

            const loginRes = await request(app)
                .post('/api/auth/login')
                .send({ email, password: 'NewPass1!' });
            expect(loginRes.statusCode).toBe(200);

            const updated = await User.findById(user._id);
            expect(updated.resetPasswordToken).toBeUndefined();
            expect(updated.resetPasswordExpires).toBeUndefined();
        });
    });

    describe('authenticated profile endpoints', () => {
        let user, token, email;

        beforeEach(async () => {
            email = uniqueEmail('profile-user');
            user = await User.create({
                username: `ProfileUser${new mongoose.Types.ObjectId()}`,
                email,
                passwordHash: await hashPassword('password123'),
                isVerified: true
            });

            const loginRes = await request(app)
                .post('/api/auth/login')
                .send({ email, password: 'password123' });
            token = loginRes.body.token;
        });

        describe('GET /me', () => {
            it('rejects a request with no token', async () => {
                const res = await request(app).get('/api/auth/me');
                expect(res.statusCode).toBe(401);
            });

            it('returns the authenticated user\'s profile', async () => {
                const res = await request(app)
                    .get('/api/auth/me')
                    .set('Authorization', `Bearer ${token}`);

                expect(res.statusCode).toBe(200);
                expect(res.body.email).toBe(email.toLowerCase());
                expect(res.body.pendingEmail).toBeNull();
            });
        });

        describe('GET /checkUsername', () => {
            it('rejects a blank username', async () => {
                const res = await request(app)
                    .get('/api/auth/checkUsername')
                    .set('Authorization', `Bearer ${token}`)
                    .query({ username: '  ' });

                expect(res.statusCode).toBe(400);
            });

            it('reports the current user\'s own username as available', async () => {
                const res = await request(app)
                    .get('/api/auth/checkUsername')
                    .set('Authorization', `Bearer ${token}`)
                    .query({ username: user.username });

                expect(res.statusCode).toBe(200);
                expect(res.body.available).toBe(true);
            });

            it('reports another user\'s username as taken', async () => {
                const res = await request(app)
                    .get('/api/auth/checkUsername')
                    .set('Authorization', `Bearer ${token}`)
                    .query({ username: testUser.username });

                expect(res.statusCode).toBe(200);
                expect(res.body.available).toBe(false);
            });
        });

        describe('PUT /profile', () => {
            it('updates bio and profile picture', async () => {
                const res = await request(app)
                    .put('/api/auth/profile')
                    .set('Authorization', `Bearer ${token}`)
                    .send({ newBio: 'Now playing: everything', newProfilePicture: 'https://img/pic.png' });

                expect(res.statusCode).toBe(200);
                expect(res.body.user.bio).toBe('Now playing: everything');
                expect(res.body.user.profilePicture).toBe('https://img/pic.png');
            });
        });

        describe('PUT /account', () => {
            it('updates the username', async () => {
                const newUsername = `RenamedUser${new mongoose.Types.ObjectId()}`;
                const res = await request(app)
                    .put('/api/auth/account')
                    .set('Authorization', `Bearer ${token}`)
                    .send({ newUsername });

                expect(res.statusCode).toBe(200);
                expect(res.body.user.username).toBe(newUsername);
            });

            it('rejects a username already taken by someone else', async () => {
                const res = await request(app)
                    .put('/api/auth/account')
                    .set('Authorization', `Bearer ${token}`)
                    .send({ newUsername: testUser.username });

                expect(res.statusCode).toBe(400);
                expect(res.body.message).toBe('Username already taken. Please try another username.');
            });

            it('sets pendingEmail and emails a re-verification link on email change', async () => {
                const newEmail = uniqueEmail('changed-email');
                const res = await request(app)
                    .put('/api/auth/account')
                    .set('Authorization', `Bearer ${token}`)
                    .send({ newEmail });

                expect(res.statusCode).toBe(200);
                expect(res.body.pendingEmail).toBe(newEmail);
                expect(sendVerificationEmail).toHaveBeenCalledTimes(1);

                const updated = await User.findById(user._id);
                expect(updated.email).toBe(email.toLowerCase()); // unchanged until verified
                expect(updated.pendingEmail).toBe(newEmail);
            });

            it('rejects a password change missing the current password', async () => {
                const res = await request(app)
                    .put('/api/auth/account')
                    .set('Authorization', `Bearer ${token}`)
                    .send({ newPassword: 'NewPassword1' });

                expect(res.statusCode).toBe(400);
                expect(res.body.message).toBe('Current password is required to change your password.');
            });

            it('rejects a password change with the wrong current password', async () => {
                const res = await request(app)
                    .put('/api/auth/account')
                    .set('Authorization', `Bearer ${token}`)
                    // confirmNewPassword must match newPassword here — the mismatch
                    // check now runs before the current-password check, so leaving
                    // it out would report a mismatch instead of the wrong-password
                    // case this test is actually after.
                    .send({
                        newPassword: 'NewPassword1!',
                        confirmNewPassword: 'NewPassword1!',
                        currentPassword: 'WrongCurrent1'
                    });

                expect(res.statusCode).toBe(400);
                expect(res.body.message).toBe('Incorrect current password. Action denied.');
            });

            it('updates the password when the current password is correct', async () => {
                const res = await request(app)
                    .put('/api/auth/account')
                    .set('Authorization', `Bearer ${token}`)
                    .send({
                        newPassword: 'NewPass1!',
                        confirmNewPassword: 'NewPass1!',
                        currentPassword: 'password123'
                    });

                expect(res.statusCode).toBe(200);

                const loginRes = await request(app)
                    .post('/api/auth/login')
                    .send({ email, password: 'NewPass1!' });
                expect(loginRes.statusCode).toBe(200);
            });
        });

        describe('DELETE /account', () => {
            it('rejects a request missing the current password', async () => {
                const res = await request(app)
                    .delete('/api/auth/account')
                    .set('Authorization', `Bearer ${token}`)
                    .send({});

                expect(res.statusCode).toBe(400);
            });

            it('rejects an incorrect password', async () => {
                const res = await request(app)
                    .delete('/api/auth/account')
                    .set('Authorization', `Bearer ${token}`)
                    .send({ currentPassword: 'WrongPassword1' });

                expect(res.statusCode).toBe(400);
            });

            it('deletes the account when the password is correct', async () => {
                const res = await request(app)
                    .delete('/api/auth/account')
                    .set('Authorization', `Bearer ${token}`)
                    .send({ currentPassword: 'password123' });

                expect(res.statusCode).toBe(200);

                const deletedUser = await User.findById(user._id);
                expect(deletedUser).toBeNull();
            });
        });
    });
});
