import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/constants/app_colors.dart';
import '../widgets/error_message.dart';
import '../services/api_service.dart';
import 'login_screen.dart';

class ResetPasswordScreen extends StatefulWidget {
  // Passed in directly when opened via an Android App Link (native deep link
  // has no browser URL to read from); left null on web, where the token is
  // read out of the page's own URL instead.
  final String? token;

  const ResetPasswordScreen({super.key, this.token});

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  // Reads user input and manages it
  final _passwordController = TextEditingController();
  final _passwordValidationController = TextEditingController();
  final _passwordFocusNode = FocusNode();

  // Pulled from the URL the emailed reset link points at (?token=...)
  String? _token;

  bool _isLoading = false;
  bool _submitted = false;
  String? _errorMessage;
  String? _passwordError;
  String? _passwordMismatch;
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;

  // Set up listeners, read the token out of the current URL
  @override
  void initState() {
    super.initState();
    _token = widget.token ?? Uri.base.queryParameters['token'];

    _passwordController.addListener(_onFieldChanged);
    _passwordController.addListener(_checkPasswordsMatch);
    _passwordValidationController.addListener(_onFieldChanged);
    _passwordValidationController.addListener(_checkPasswordsMatch);
    _passwordFocusNode.addListener(_validatePasswordOnBlur);
  }

  // Listener to check for changes in the form
  void _onFieldChanged() {
    setState(() {});
  }

  // Make sure password matches in both fields
  void _checkPasswordsMatch() {
    setState(() {
      if (_passwordValidationController.text.isEmpty) {
        _passwordMismatch = null;
      } else if (_passwordController.text !=
          _passwordValidationController.text) {
        _passwordMismatch = 'Passwords don\'t match';
      } else {
        _passwordMismatch = null;
      }
    });
  }

  // Check that the password is strong enough
  void _validatePasswordOnBlur() {
    if (!_passwordFocusNode.hasFocus && _passwordController.text.isNotEmpty) {
      setState(() {
        _passwordError = _getPasswordError(_passwordController.text);
      });
    }
  }

  // Handle the error message logic
  String? _getPasswordError(String password) {
    if (password.length < 8 || password.length > 14) {
      return 'Password must be 8-14 characters';
    }
    if (!password.contains(RegExp(r'[A-Z]'))) {
      return 'Password must contain an uppercase letter';
    }
    if (!password.contains(RegExp(r'[a-z]'))) {
      return 'Password must contain a lowercase letter';
    }
    if (!password.contains(RegExp(r'[0-9]'))) {
      return 'Password must contain a number';
    }
    if (!password.contains(RegExp(r'[!@#$%^&*(),.?":{}|<>]'))) {
      return 'Password must contain a special character';
    }
    return null;
  }

  // Checking if the form is ready to send yet or not
  bool _isFormValid() {
    return _passwordController.text.isNotEmpty &&
        _passwordValidationController.text.isNotEmpty &&
        _passwordMismatch == null &&
        _getPasswordError(_passwordController.text) == null;
  }

  // Called automatically when screen is destroyed
  @override
  void dispose() {
    _passwordController.removeListener(_onFieldChanged);
    _passwordController.removeListener(_checkPasswordsMatch);
    _passwordValidationController.removeListener(_onFieldChanged);
    _passwordValidationController.removeListener(_checkPasswordsMatch);
    _passwordFocusNode.removeListener(_validatePasswordOnBlur);

    _passwordController.dispose();
    _passwordValidationController.dispose();
    _passwordFocusNode.dispose();
    super.dispose();
  }

  // Reset password logic, API interaction
  Future<void> _handleSubmit() async {
    if (_passwordMismatch != null || _token == null) {
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final apiService = ApiService();
      // Backend reads the token from the query string, not the body
      final response = await apiService.post(
        '/auth/resetPassword?token=${Uri.encodeQueryComponent(_token!)}',
        {
          'newPassword': _passwordController.text,
          'confirmNewPassword': _passwordController.text,
        },
      );

      // If widget no longer on screen, leave
      if (!mounted) return;

      if (response.statusCode == 200) {
        setState(() {
          _submitted = true;
        });
      } else {
        // Surface the backend's own message (e.g. "can't match previous
        // password") instead of a generic one, falling back if unparseable
        String message =
            'This reset link is invalid or has expired. Please request a new one.';
        try {
          final data = jsonDecode(response.body);
          if (data['message'] != null) {
            message = data['message'];
          }
        } catch (_) {
          // Keep the generic message
        }
        setState(() {
          _errorMessage = message;
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Something went wrong. Please try again.';
      });
    } finally {
      // If widget no longer on screen, skip this
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  void _backToLogin() {
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (context) => const LoginScreen()),
    );
  }

  // Screen contents
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.darkGreen,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: _token == null
                ? [
                    Text(
                      'This password reset link is invalid or has expired.',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.inter(color: AppColors.textLight),
                    ),
                    const SizedBox(height: 16),
                    Center(
                      child: TextButton(
                        onPressed: _backToLogin,
                        child: Text(
                          'Back to Login',
                          style: GoogleFonts.inter(color: AppColors.textLight),
                        ),
                      ),
                    ),
                  ]
                : _submitted
                ? [
                    Text(
                      'Your password has been reset. You can now log in.',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.inter(color: AppColors.textLight),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFE0E0E0),
                        disabledBackgroundColor: const Color(0xFFE0E0E0),
                        foregroundColor: Colors.black54,
                        disabledForegroundColor: Colors.black26,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      onPressed: _backToLogin,
                      child: Text(
                        'Back to Login',
                        style: GoogleFonts.inter(fontSize: 16),
                      ),
                    ),
                  ]
                : [
                    Text(
                      'Enter a new password for your account.',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.inter(color: AppColors.textLight),
                    ),
                    const SizedBox(height: 20),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        'New Password',
                        style: GoogleFonts.inter(
                          color: AppColors.textLight,
                          fontSize: 14,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _passwordController,
                      focusNode: _passwordFocusNode,
                      obscureText: _obscurePassword,
                      style: GoogleFonts.inter(color: Colors.black87),
                      decoration: InputDecoration(
                        hintText: 'New Password',
                        hintStyle: GoogleFonts.inter(color: Colors.black45),
                        filled: true,
                        fillColor: AppColors.textBoxFill,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 14,
                        ),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                        helperText:
                            '8-14 characters, 1 uppercase letter, 1 lowercase letter, 1 number, 1 special character',
                        helperMaxLines: 2,
                        helperStyle: GoogleFonts.inter(
                          color: AppColors.textLight,
                          fontSize: 11,
                        ),
                        error: _passwordError != null
                            ? ErrorMessage(message: _passwordError!)
                            : null,
                        suffixIcon: IconButton(
                          icon: Icon(
                            _obscurePassword
                                ? Icons.visibility_off
                                : Icons.visibility,
                            color: Colors.black45,
                          ),
                          onPressed: () {
                            setState(() {
                              _obscurePassword = !_obscurePassword;
                            });
                          },
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        'Confirm New Password',
                        style: GoogleFonts.inter(
                          color: AppColors.textLight,
                          fontSize: 14,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _passwordValidationController,
                      obscureText: _obscureConfirmPassword,
                      style: GoogleFonts.inter(color: Colors.black87),
                      decoration: InputDecoration(
                        hintText: 'Confirm New Password',
                        hintStyle: GoogleFonts.inter(color: Colors.black45),
                        filled: true,
                        fillColor: AppColors.textBoxFill,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 14,
                        ),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                        error: _passwordMismatch != null
                            ? ErrorMessage(message: _passwordMismatch!)
                            : null,
                        suffixIcon: IconButton(
                          icon: Icon(
                            _obscureConfirmPassword
                                ? Icons.visibility_off
                                : Icons.visibility,
                            color: Colors.black45,
                          ),
                          onPressed: () {
                            setState(() {
                              _obscureConfirmPassword =
                                  !_obscureConfirmPassword;
                            });
                          },
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    if (_errorMessage != null)
                      Center(
                        child: ErrorMessage(
                          message: _errorMessage!,
                          textAlign: TextAlign.center,
                        ),
                      ),
                    const SizedBox(height: 8),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFE0E0E0),
                        disabledBackgroundColor: const Color(0xFFE0E0E0),
                        foregroundColor: Colors.black54,
                        disabledForegroundColor: Colors.black26,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      onPressed: (_isLoading || !_isFormValid())
                          ? null
                          : _handleSubmit,
                      child: _isLoading
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : Text(
                              'Reset Password',
                              style: GoogleFonts.inter(fontSize: 16),
                            ),
                    ),
                  ],
          ),
        ),
      ),
    );
  }
}
