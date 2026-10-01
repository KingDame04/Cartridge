import 'package:flutter/material.dart';
import 'dart:convert';
import '../services/api_service.dart';
import 'email_verif_screen.dart';
import 'login_screen.dart';
import 'package:mobile/constants/app_colors.dart';
import 'package:google_fonts/google_fonts.dart';
import '../widgets/error_message.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  // Read user input and manage it
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  final _emailController = TextEditingController();
  final _emailValidationController = TextEditingController();
  final _passwordValidationController = TextEditingController();

  // Set up a listener for the email validation
  @override
  void initState() {
    super.initState();
    // Listeners initialization
    _emailController.addListener(_checkEmailsMatch);
    _emailValidationController.addListener(_checkEmailsMatch);
    _usernameController.addListener(_onFieldChanged);
    _passwordController.addListener(_onFieldChanged);
    _emailController.addListener(_onFieldChanged);
    _emailValidationController.addListener(_onFieldChanged);
    _passwordValidationController.addListener(_onFieldChanged);
    _usernameFocusNode.addListener(_validateUsernameOnBlur);
    _passwordFocusNode.addListener(_validatePasswordOnBlur);
    _emailFocusNode.addListener(_validateEmailOnBlur);
    _passwordController.addListener(_checkPasswordsMatch);
    _passwordValidationController.addListener(_checkPasswordsMatch);
  }

  // Check to make sure both email fields match
  void _checkEmailsMatch() {
    setState(() {
      if (_emailValidationController.text.isEmpty) {
        _emailMismatch = null;
      } else if (_emailController.text != _emailValidationController.text) {
        _emailMismatch = 'Email addresses don\'t match';
      } else {
        _emailMismatch = null;
      }
    });
  }

  // Make sure usernames don't have spaces in them
  void _validateUsernameOnBlur() {
    if (!_usernameFocusNode.hasFocus && _usernameController.text.isNotEmpty) {
      setState(() {
        if (_usernameController.text.contains(' ')) {
          _usernameError = 'Username cannot contain spaces';
        } else {
          _usernameError = null;
        }
      });
    }
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

  // Make sure the email uses a valid email pattern (something@email.com)
  void _validateEmailOnBlur() {
    if (!_emailFocusNode.hasFocus && _emailController.text.isNotEmpty) {
      setState(() {
        final emailPattern = RegExp(r'^[\w\.-]+@[\w\.-]+\.\w+$');
        if (!emailPattern.hasMatch(_emailController.text)) {
          _emailFormatError = 'Enter a valid email address';
        } else {
          _emailFormatError = null;
        }
      });
    }
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

  // Called automatically when screen is destroyed
  @override
  void dispose() {
    // Release listeners
    _emailController.removeListener(_checkEmailsMatch);
    _emailValidationController.removeListener(_checkEmailsMatch);
    _usernameController.removeListener(_onFieldChanged);
    _passwordController.removeListener(_onFieldChanged);
    _emailController.removeListener(_onFieldChanged);
    _emailValidationController.removeListener(_onFieldChanged);
    _passwordValidationController.removeListener(_onFieldChanged);
    _usernameFocusNode.removeListener(_validateUsernameOnBlur);
    _passwordFocusNode.removeListener(_validatePasswordOnBlur);
    _emailFocusNode.removeListener(_validateEmailOnBlur);
    _passwordController.removeListener(_checkPasswordsMatch);
    _passwordValidationController.removeListener(_checkPasswordsMatch);

    // Release resources held by controllers
    _usernameController.dispose();
    _passwordController.dispose();
    _emailController.dispose();
    _emailValidationController.dispose();
    _usernameFocusNode.dispose();
    _passwordFocusNode.dispose();
    _emailFocusNode.dispose();
    _passwordValidationController.dispose();

    // Do what dispose() usually does as well
    super.dispose();
  }

  bool _isLoading = false;
  String? _errorMessage;
  String? _emailMismatch;
  String? _passwordMismatch;
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;

  final _usernameFocusNode = FocusNode();
  final _passwordFocusNode = FocusNode();
  final _emailFocusNode = FocusNode();

  String? _usernameError;
  String? _passwordError;
  String? _emailFormatError;

  // Checking if the form is ready to send yet or not
  bool _isFormValid() {
    return _usernameController.text.isNotEmpty &&
        !_usernameController.text.contains(' ') &&
        _passwordController.text.isNotEmpty &&
        _getPasswordError(_passwordController.text) == null &&
        _passwordValidationController.text.isNotEmpty &&
        _emailController.text.isNotEmpty &&
        RegExp(r'^[\w\.-]+@[\w\.-]+\.\w+$').hasMatch(_emailController.text) &&
        _emailValidationController.text.isNotEmpty &&
        _emailMismatch == null &&
        _passwordMismatch == null;
  }

  // Registration logic, API interaction
  Future<void> _handleRegister() async {
    // If the emails and/or password don't match, don't allow registration
    if (_emailMismatch != null || _passwordMismatch != null) {
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final apiService = ApiService();
      final response = await apiService.post('/auth/register', {
        'email': _emailController.text,
        'username': _usernameController.text,
        'password': _passwordController.text,
        'confirmPassword': _passwordValidationController.text,
      });

      // If widget no longer on screen, leave
      if (!mounted) return;

      // If response from API is good
      if (response.statusCode == 201) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            // Backend's response doesn't echo the username back, so use what was typed
            builder: (context) => VerifyEmailScreen(
              username: _usernameController.text,
              email: _emailController.text,
            ),
          ),
        );
      } else {
        final data = jsonDecode(response.body);
        setState(() {
          _errorMessage =
              data['message'] ??
              data['error'] ??
              'Registration failed. Please check your information and try again.';
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

  // Screen contents
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.darkGreen,
      body: SafeArea(
        child: Theme(
          data: Theme.of(context).copyWith(
            textSelectionTheme: TextSelectionThemeData(
              cursorColor: AppColors.darkGreen,
              selectionColor: AppColors.darkGreen.withOpacity(0.4),
              selectionHandleColor: AppColors.darkGreen,
            ),
          ),
          child: LayoutBuilder(
            builder: (context, constraints) {
              return SingleChildScrollView(
                padding: const EdgeInsets.all(24.0),
                child: ConstrainedBox(
                  constraints: BoxConstraints(
                    minHeight: constraints.maxHeight - 48,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      _buildLabel('Username'),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _usernameController,
                        focusNode: _usernameFocusNode,
                        style: GoogleFonts.inter(color: Colors.black87),
                        cursorColor: AppColors.darkGreen,
                        decoration: _fieldDecoration(
                          hint: 'Username',
                          errorText: _usernameError,
                        ),
                      ),
                      const SizedBox(height: 20),

                      _buildLabel('Password'),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _passwordController,
                        focusNode: _passwordFocusNode,
                        obscureText: _obscurePassword,
                        style: GoogleFonts.inter(color: Colors.black87),
                        cursorColor: AppColors.darkGreen,
                        decoration: _fieldDecoration(
                          hint: 'Password',
                          errorText: _passwordError,
                          helperText:
                              '8-14 characters, 1 uppercase letter, 1 lowercase letter, 1 number, 1 special character',
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

                      _buildLabel('Confirm Password'),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _passwordValidationController,
                        obscureText: _obscureConfirmPassword,
                        style: GoogleFonts.inter(color: Colors.black87),
                        cursorColor: AppColors.darkGreen,
                        decoration: _fieldDecoration(
                          hint: 'Password',
                          errorText: _passwordMismatch,
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
                      const SizedBox(height: 20),

                      _buildLabel('Email Address'),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _emailController,
                        focusNode: _emailFocusNode,
                        style: GoogleFonts.inter(color: Colors.black87),
                        cursorColor: AppColors.darkGreen,
                        decoration: _fieldDecoration(
                          hint: 'Email Address',
                          errorText: _emailFormatError,
                        ),
                      ),
                      const SizedBox(height: 20),

                      _buildLabel('Confirm Your Email'),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _emailValidationController,
                        style: GoogleFonts.inter(color: Colors.black87),
                        cursorColor: AppColors.darkGreen,
                        decoration: _fieldDecoration(
                          hint: 'Email Address',
                          errorText: _emailMismatch,
                        ),
                      ),

                      const SizedBox(height: 16),
                      if (_errorMessage != null)
                        ErrorMessage(message: _errorMessage!),
                      const SizedBox(height: 8),

                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFE0E0E0),
                            disabledBackgroundColor: const Color(
                              0xFFE0E0E0,
                            ), // same solid grey, no opacity
                            foregroundColor: Colors.black54,
                            disabledForegroundColor: Colors
                                .black26, // this signals "disabled" instead
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          onPressed: (_isLoading || !_isFormValid())
                              ? null
                              : _handleRegister,
                          child: _isLoading
                              ? const SizedBox(
                                  height: 20,
                                  width: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Text(
                                      'Register',
                                      style: GoogleFonts.inter(
                                        color: Colors.black54,
                                        fontSize: 16,
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    const Icon(
                                      Icons.lock,
                                      size: 16,
                                      color: Colors.black54,
                                    ),
                                  ],
                                ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Center(
                        child: TextButton(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => const LoginScreen(),
                              ),
                            );
                          },
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                'Sign in here',
                                style: GoogleFonts.inter(
                                  color: AppColors.textLight,
                                ),
                              ),
                              const SizedBox(width: 4),
                              const Icon(
                                Icons.arrow_forward,
                                size: 16,
                                color: AppColors.textLight,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildLabel(String text) {
    return Text(
      text,
      style: GoogleFonts.inter(color: AppColors.textLight, fontSize: 14),
    );
  }

  InputDecoration _fieldDecoration({
    required String hint,
    String? errorText,
    String? helperText,
    Widget? suffixIcon,
  }) {
    return InputDecoration(
      hintText: hint,
      hintStyle: GoogleFonts.inter(color: Colors.black45),
      filled: true,
      fillColor: AppColors.textBoxFill,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
      error: errorText != null ? ErrorMessage(message: errorText) : null,
      helperText: helperText,
      helperMaxLines: 2,
      helperStyle: GoogleFonts.inter(color: AppColors.textLight, fontSize: 11),
      suffixIcon: suffixIcon,
    );
  }
}
