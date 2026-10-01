const bcrypt = require('bcrypt');

const hashPassword = async (password) => {
    return await bcrypt.hash(password, 10);
};

const verifyPassword = async (password, hashPassword) => {
    // Check user submitted password to hash password
    return await bcrypt.compare(password, hashPassword);
};

const matchesOldPassword = async (newPassword, oldPassword) => {
    return await bcrypt.compare(newPassword, oldPassword);
};

module.exports = { hashPassword, verifyPassword, matchesOldPassword };
