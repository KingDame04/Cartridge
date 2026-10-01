const { hashPassword, verifyPassword, matchesOldPassword } = require('../../src/utils/hash');

describe('hash utils', () => {
    test('hashPassword returns a bcrypt hash different from the plaintext', async () => {
        const hash = await hashPassword('Password123');

        expect(hash).not.toBe('Password123');
        expect(hash).toMatch(/^\$2[aby]\$/);
    });

    test('hashPassword produces a different salt every time', async () => {
        const hash1 = await hashPassword('Password123');
        const hash2 = await hashPassword('Password123');

        expect(hash1).not.toBe(hash2);
    });

    test('verifyPassword resolves true for the correct password', async () => {
        const hash = await hashPassword('Password123');

        await expect(verifyPassword('Password123', hash)).resolves.toBe(true);
    });

    test('verifyPassword resolves false for an incorrect password', async () => {
        const hash = await hashPassword('Password123');

        await expect(verifyPassword('WrongPassword', hash)).resolves.toBe(false);
    });

    test('matchesOldPassword resolves true when the new password equals the old one', async () => {
        const oldHash = await hashPassword('Password123');

        await expect(matchesOldPassword('Password123', oldHash)).resolves.toBe(true);
    });

    test('matchesOldPassword resolves false when the new password differs from the old one', async () => {
        const oldHash = await hashPassword('Password123');

        await expect(matchesOldPassword('DifferentPassword1', oldHash)).resolves.toBe(false);
    });
});
