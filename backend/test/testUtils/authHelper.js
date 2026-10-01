const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../../src/models/users');
const { hashPassword } = require('../../src/utils/hash');

// Creates an already-verified user directly in the DB and signs a real JWT
// for it, so route tests can skip the register/verify-email flow and go
// straight to exercising authenticated endpoints.
const createVerifiedUser = async (overrides = {}) => {
    const unique = new mongoose.Types.ObjectId().toString();

    const user = await User.create({
        username: overrides.username || `tester_${unique}`,
        email: overrides.email || `tester_${unique}@cartridgeapp.fun`,
        passwordHash: await hashPassword(overrides.password || 'Password123'),
        isVerified: true
    });

    const token = jwt.sign(
        { userId: user._id.toString(), role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '20m' }
    );

    return { user, token };
};

module.exports = { createVerifiedUser };
