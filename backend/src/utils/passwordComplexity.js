const checkPasswordComplexity = async (inputtedPassword, min = 8, max = 14) => {
    if (inputtedPassword && typeof inputtedPassword === 'string') {
        const regex = new RegExp(`^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{${min},${max}}$`);
        return regex.test(inputtedPassword);
    }

    return false;

};

module.exports = { checkPasswordComplexity };

