const User = require ('../models/users');
const mongoose = require('mongoose');

const JWT = require('jsonwebtoken');
const crypto = require('crypto');

const { hashPassword } = require('../utils/hash');
const { verifyPassword } = require('../utils/hash');
const { matchesOldPassword } = require('../utils/hash');

const { sendVerificationEmail } = require('../utils/email');
const { sendPasswordResetEmail } = require('../utils/email');
const { availableMemory } = require('process');

const { checkPasswordComplexity } = require('../utils/passwordComplexity')

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body

        // Validate user input
        if (!email || !password) {
            return res.status(400).json({ message: 'Please enter your email and password.' });
        }

        // Check for user in database
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(400).json({ message: 'Email/Password incorrect' });
        }
        
        // Check user submitted password to hash password
        const isMatch = await verifyPassword(password, user.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Email/Password incorrect' });
        }

        if (user.isVerified === false) {
            const newVerificationToken = crypto.randomBytes(20).toString('hex');
            
            user.verificationToken = newVerificationToken;
            try {
                await user.save();

                await sendVerificationEmail(user.email, newVerificationToken);

                console.log(`http://localhost:5000/api/auth/verifyEmail?token=${newVerificationToken}`);

                return res.status(403).json({
                    success: false,
                    message: 'Your account has not yet been verified. A new verification link has been sent.'
                });
            } catch (emailError) {
                console.error("Non-fatal email resend warning:", emailError.message);

                return res.status(403).json({
                    success: false,
                    message: 'Your account is unverified. We attempted to route a new verfication link, but our mail delivery system is currently down. Please try again shortly.'
                });
            }
        }

        if (!process.env.JWT_SECRET) {
            console.error("FATAL: JWT_SECRET environment variable is missing!");
            return res.status(500).json({ message: 'Internal server configuration error '});
        }

        // Create and sign a JWT. Kept short (20 min) since authenticateToken
        // reissues a fresh one on every authenticated request — this is
        // effectively a sliding session that only truly expires after 20
        // minutes of inactivity, not 20 minutes after login.
        const payload = { userId: user.id, role: user.role };
        const token = JWT.sign (
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '20m'}
        );

        // Send back token along with non-sensitive user data
        return res.status(200).json({
            message: 'Login successful.',
            token: token,
            user: { id: user.id, email: user.email }
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server Error' });
    }
}

exports.logout = async(req, res) => {
    try {
        return res.status(200).json({
            message: 'Logout Successful'
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server Error' });
    }
}

exports.register = async(req, res) => {
    try {
        const { username, email, password, confirmPassword } = req.body

        // Validate user inputs
        if (!username || !password || !email || !confirmPassword) {
            return res.status(400).json ({ message: 'Please fill out all fields' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json ({ message: 'Passwords do NOT match' });
        }

        const isValidComplexity = await checkPasswordComplexity(password);
        if (!isValidComplexity) {
            return res.status(400).json({ message: "Password does not meet criteria." })
        }

        const usernameExist = await User.findOne({ username: { $regex: `^${username.trim()}$`, $options: 'i'} 
        });

        if (usernameExist) {
            return res.status(400).json({ message: "Username already taken! Please try again." })
        }

        // Check database to ensure user is NOT in database already with the email.
        const emailExists = await User.findOne({ email: email.toLowerCase() });
        if (emailExists) {
            return res.status(400).json({ message: 'Account already exists. Please sign in.' });
        }

        const verificationToken = crypto.randomBytes(32).toString('hex');

        // Calls utility for hashing the password
        const securePassword = await hashPassword(password);
        
        const newUser = await User.create({
            username: username,
            email: email.toLowerCase(),
            passwordHash: securePassword,
            verificationToken: verificationToken,
            isVerified: false
        });
        await sendVerificationEmail(newUser.email, verificationToken);
        
        console.log(`http://localhost:5000/api/auth/verifyEmail?token=${verificationToken}`);
        
        res.status(201).json({
            message: 'Account added to DB.',
            email: newUser.email
        });

    } catch (err) {
        console.error("CRITICAL EXCEPTION", err);
        res.status(500).json({error: 'Server-side error'});
    }
}

exports.forgotPassword = async(req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Please enter your email address' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        
        // For security purposes, even if the user doesn't exist, send a validation message
        if (!user) {
            return res.status(200).json({ message: 'A reset link has been sent to your email.'})
        }
        
        // Generate secure crypto token and add an expiration time 
        const token = crypto.randomBytes(32).toString('hex');
        const tokenExpiration = Date.now() + 600000; // 10 minutes before token expires

        // Save token value to database user doc
        user.resetPasswordToken = token;
        user.resetPasswordExpires = tokenExpiration;
        await user.save();

        await sendPasswordResetEmail(user.email, token);

        console.log(`👉 http://localhost:5000/api/auth/resetPassword?token=${token}`);

        return res.status(201).json({
            success: true, 
            message: 'Password Reset Email Sent!'
        });
        
    } catch (emailError) {
        console.error("Non-fatal error: Password reset email failed to send.", emailError.message);
        res.status(502).json({
            success: false,
            message: "The server generated the token, but failed to deliver the email notification. Please try again"
        })
    }
}

exports.resetPassword = async (req, res) => {
    try {
        const { token } = req.query;
        const { newPassword } = req.body;
        const { confirmNewPassword } = req.body;

        if (!token || !newPassword || !confirmNewPassword) { 
            return res.status(400).json({ message: 'Missing required reset fields.'})
        }

        if (newPassword !== confirmNewPassword) {
            return res.status(400).json({ message: 'Passwords do NOT match! Please try again.' })
        }

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() } //$gt means greater than current time"
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset token.' })
        }

        const isValidComplexity = await checkPasswordComplexity(newPassword);
        if (!isValidComplexity) {
            return res.status(400).json({ message: "Password does not meet criteria." })
        }

        const newMatchesOld = await matchesOldPassword (newPassword, user.passwordHash);
        if (newMatchesOld) {
            return res.status(400).json({ message: 'Your new password CANNOT match your previous password.' });
        }

        const securePassword = await hashPassword(newPassword);
        user.passwordHash = securePassword;

        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();
        return res.status(200).json({ message: 'Password updated! You may now log into your account.' })
    
    } catch (error) {
        console.error("ERROR RESETTING PASSWORD", error);
        return res.status(500).json({ message: 'Server error during password update.' })
    } 
}

exports.verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({ message: 'Verfication token is missing.' });
        }

        const user = await User.findOne({ verificationToken: token });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired verfication token' });
        }

        const isEmailUpdate = !!user.pendingEmail;

        if (isEmailUpdate) {
            user.email = user.pendingEmail;
            user.pendingEmail = null;
        } else {
            user.isVerified = true;
        }

        user.verificationToken = undefined;

        await user.save();

        return res.status(200).json({ 
            message: isEmailUpdate
            ? 'Your email address has been successfully updated!'
            : 'Email verified! Welcome to CARTRIDGE. You may now sign in!' });
   
    } catch(err) {
        console.error("CRITICAL EXCEPTION", err);
        res.status(500).json({error: 'Server-side error'});
    }
}

exports.resendEmailVerification = async(req, res) => {
    try {
        const { email } = req.body;

        if (!email || email.trim() === "") {
            return res.status(400).json ({ message: "Something went wrong. Can NOT find account registration!" });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        
        // json return is affirmative for security concerns
        if (!user) {
            return res.status(200).json({ message: "Email verification link sent." })
        }

        if (user.isVerified) {
            return res.status(400).json({ message: "Account already verified. Please LOG IN." })
        }
        
        const newVerificationToken = crypto.randomBytes(32).toString('hex');
        user.verificationToken = newVerificationToken;
        await user.save();

        await sendVerificationEmail(user.email, newVerificationToken);

        console.log(`http://localhost:5000/api/auth/verifyEmail?token=${newVerificationToken}`);

        return res.status(200).json({
            message: "A new verification link has been sent to your inbox!"
        });
    } catch (error) {
        console.error("Resend verification error;", error);
        return res.status(500).json({ message: "Server-side error trying to resend email" });
    }
};

exports.me = async (req, res) => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(400).json({ message: "Verfication token is missing." })
        }

        const user = await User.findById(userId).select('profilePicture username bio email pendingEmail');

        if (!user) {
            return res.status(404).json({ message: "User NOT Found!"})
        }

        return res.status(200).json ({
            profilePicture: user.profilePicture,
            username: user.username,
            bio: user.bio,
            email: user.email,
            pendingEmail: user.pendingEmail || null
        })

    } catch(err) {
        console.error("CRITICAL EXCEPTION")
        res.status(500).json({error: 'Could not fetch user information'});
    }
}

exports.checkUsername = async (req, res) => {
    try {
        const { username } = req.query;

        const currentUserId = req.user?.userId;

        if (!username || username.trim() === "") {
            return res.status(400).json({ message: "Please enter a valid username"});
        }
        
        const existingUser = await User.findOne({ username: { $regex: `^${username.trim()}$`, $options: 'i' }
        }); 

        if (existingUser) {
            if (currentUserId && existingUser._id.toString() === currentUserId) {
                return res.status(200).json({ 
                    available: true
                });
            }
            return res.status(200).json({
                available: false, 
                message: "Username already taken. Please try another username."
            })
        }

        return res.status(200).json({ 
            available: true,
            message: "Username Available!"
        });

    } catch {
        console.error("CRITICAL EXCEPTION")
        res.status(500).json({error: 'Operation terminated!' });
    }
}

exports.profile = async (req, res) => {
    try {
        
        const { newProfilePicture, newBio } = req.body;

        const userId = req.user?.id || req.user?._id || req.user?.userId;

        const updatedUser = await User.findByIdAndUpdate(
            userId, 
            {
                profilePicture: newProfilePicture,
                bio: newBio
            },
            { returnDocument: 'after', runValidators:true } // Returns updated document
        ).select('profilePicture bio');

        return res.status(200).json({
            message: "Profile updated successfully",
            user: updatedUser
        });
    } catch(error) {
        console.error("Profile update error:", error);
        return res.status(500).json({ 
            message: "Something went wrong trying to update your profile",
            debugError: error.message
        });
    }
}

exports.account = async (req, res) => {
    try {
        
        const userId = req.user?.id || req.user?._id || req.user?.userId;

        const { newUsername, newEmail, newPassword } = req.body;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found"});
        }

        if (newUsername && newUsername.trim() !== "" && newUsername !== user.username) {
            const usernameExists = await User.findOne({
                username: { $regex: `^${newUsername.trim()}$`, $options: 'i'}
            });

            if (usernameExists) {
                return res.status(400).json({
                    message: "Username already taken. Please try another username."
                });
            }
            user.username = newUsername.trim();
        }

        if (newEmail && newEmail !== user.email) {
            const emailExists = await User.findOne({ email: newEmail });
            if (emailExists) return res.status(400).json({ message: "Account already exists with this Email"});
            
            user.pendingEmail = newEmail;
            user.verificationToken = crypto.randomBytes(20).toString('hex');
        }

        if (newPassword) {
            const { currentPassword } = req.body;
            //const { newPassword } = req.body;
            const { confirmNewPassword } = req.body;

            if (!currentPassword) {
                return res.status(400).json({ message: "Current password is required to change your password." })
            }

            if (newPassword !== confirmNewPassword) {
                return res.status(400).json({ message: "Passwords do NOT match!" });
            }

            const isMatch = await verifyPassword(currentPassword, user.passwordHash);
            if (!isMatch) {
                return res.status(400).json({ message: "Incorrect current password. Action denied." });
            }

            const isValidComplexity = await checkPasswordComplexity(newPassword);
            if (!isValidComplexity) {
                return res.status(400).json({ message: "Password does not meet criteria." })
            }

            user.passwordHash = await hashPassword(newPassword);
        }

        await user.save();

        if (newEmail) {
            try {
                await sendVerificationEmail(user.pendingEmail, user.verificationToken);
            } catch (emailError) {
                console.error("Failed to send re-verification email:", emailError);
            }
        }

        return res.status(200).json({
            message: newEmail
            ? "Account updated. Please check your new email to verify your account."
            : "Account settings updated successfully",
            pendingEmail: user.pendingEmail || null,
            user: {
                _id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error("Account update error:", error);
        return res.status(500).json({ message: "Internal server error updating account settings" });
    }
}

exports.deleteAccount = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id || req.user?.userId;
        const { currentPassword } = req.body;

        if (!currentPassword) {
            return res.status(400).json({ message: "Current password is required to delete your account." })
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const isMatch = await verifyPassword(currentPassword, user.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ message: "Incorrect password. Permission to delete denied! "});
        }

        await User.findByIdAndDelete(userId);

        return res.status(200).json({
            message: "Your CARTRIDGE account has been permanently deleted. May the road lead you to warm sands."
        });
    } catch (error) {
        console.error("Account deletion error:", error);
        return res.status(500).json({ message: "Internal server error trying to delete account."})
    }
};