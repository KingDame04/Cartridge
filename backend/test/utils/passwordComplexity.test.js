const { checkPasswordComplexity } = require('../../src/utils/passwordComplexity');

describe('checkPasswordComplexity', () => {
    test('accepts a password with upper/lower/digit/special within 8-14 chars', async () => {
        await expect(checkPasswordComplexity('P@ss1234')).resolves.toBe(true);
    });

    test('rejects a password shorter than the minimum', async () => {
        await expect(checkPasswordComplexity('P@s1')).resolves.toBe(false);
    });

    test('rejects a password missing a special character', async () => {
        await expect(checkPasswordComplexity('Password123')).resolves.toBe(false);
    });

    test('rejects a password missing an uppercase letter', async () => {
        await expect(checkPasswordComplexity('p@ssword1')).resolves.toBe(false);
    });

    test('rejects a password missing a lowercase letter', async () => {
        await expect(checkPasswordComplexity('P@SSWORD1')).resolves.toBe(false);
    });

    test('rejects a password missing a digit', async () => {
        await expect(checkPasswordComplexity('P@ssword')).resolves.toBe(false);
    });

    test('rejects a password longer than the default max (14)', async () => {
        await expect(checkPasswordComplexity('P@ssword123456789')).resolves.toBe(false);
    });

    test('respects a custom min/max range', async () => {
        await expect(checkPasswordComplexity('P@ss1', 4, 6)).resolves.toBe(true);
        await expect(checkPasswordComplexity('P@ss12345', 4, 6)).resolves.toBe(false);
    });

    test('rejects non-string input instead of throwing', async () => {
        await expect(checkPasswordComplexity(undefined)).resolves.toBe(false);
        await expect(checkPasswordComplexity(null)).resolves.toBe(false);
        await expect(checkPasswordComplexity(12345678)).resolves.toBe(false);
    });
});
