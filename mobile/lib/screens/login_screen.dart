import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'dart:convert';
import '../services/api_service.dart';
import '../services/auth_state.dart';
import 'forgot_pw_screen.dart';
import 'main_nav_screen.dart';
import 'register_screen.dart';
import 'package:mobile/constants/app_colors.dart';
import 'package:google_fonts/google_fonts.dart';
import '../widgets/error_message.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  // Reads user input and manages it
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  // Pre-fill the email field if "Remember me" saved one last time
  @override
  void initState() {
    super.initState();
    final rememberedEmail =
        Provider.of<AuthState>(context, listen: false).rememberedEmail;
    if (rememberedEmail != null) {
      _emailController.text = rememberedEmail;
      _rememberMe = true;
    }
  }

  // Called automatically when screen is destroyed
  @override
  void dispose() {
    // Release resources used by controllers
    _emailController.dispose();
    _passwordController.dispose();
    // Do what dispose() usually does as well
    super.dispose();
  }

  bool _isLoading = false;
  String? _errorMessage;
  bool _obscurePassword = true;
  bool _rememberMe = true;

  bool _isFormValid() {
    return _emailController.text.trim().isNotEmpty &&
        _passwordController.text.trim().isNotEmpty;
  }

  // Login logic, API interaction
  Future<void> _handleLogin() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final apiService = ApiService();
      final response = await apiService.post('/auth/login', {
        'email': _emailController.text,
        'password': _passwordController.text,
      });

      // If widget no longer on screen, leave
      if (!mounted) return;

      // If response from API is good
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final authState = Provider.of<AuthState>(context, listen: false);
        // Backend embeds "Bearer " into the token string itself; strip it here
        // since ApiService adds its own "Bearer " prefix on authenticated calls
        final rawToken = (data['token'] as String).replaceFirst('Bearer ', '');
        await authState.login(
          rawToken,
          data['user']['id'].toString(),
          data['user']['email'],
        );
        await authState.setRememberedEmail(
          _rememberMe ? _emailController.text.trim() : null,
        );

        if (!mounted) return;
        // Clear the splash/login stack so the back button can't return to them
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (context) => const MainNavScreen()),
          (route) => false,
        );
      } else {
        // Surface the backend's own message (e.g. unverified-account notice
        // on a 403) instead of a generic one, falling back if unparseable
        String message = 'Invalid email or password';
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
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Email Address',
                  style: GoogleFonts.inter(
                    color: AppColors.textLight,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _emailController,
                  onChanged: (_) => setState(() {}),
                  style: GoogleFonts.inter(color: Colors.black87),
                  cursorColor: AppColors.darkGreen,
                  decoration: InputDecoration(
                    hintText: 'Email Address',
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
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  'Password',
                  style: GoogleFonts.inter(
                    color: AppColors.textLight,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  onChanged: (_) => setState(() {}),
                  style: GoogleFonts.inter(color: Colors.black87),
                  cursorColor: AppColors.darkGreen,
                  decoration: InputDecoration(
                    hintText: 'Password',
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
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    InkWell(
                      onTap: () =>
                          setState(() => _rememberMe = !_rememberMe),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Checkbox(
                            value: _rememberMe,
                            activeColor: AppColors.lightGreen,
                            checkColor: AppColors.darkGreen,
                            onChanged: (value) =>
                                setState(() => _rememberMe = value ?? false),
                          ),
                          Text(
                            'Remember me',
                            style: GoogleFonts.inter(
                              color: AppColors.textLight,
                            ),
                          ),
                        ],
                      ),
                    ),
                    TextButton(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => const ForgotPasswordScreen(),
                          ),
                        );
                      },
                      child: Text(
                        'Forgot Password?',
                        style: GoogleFonts.inter(color: AppColors.textLight),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                if (_errorMessage != null)
                  ErrorMessage(message: _errorMessage!),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
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
                        : _handleLogin,
                    child: _isLoading
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                'Sign In',
                                style: GoogleFonts.inter(fontSize: 16),
                              ),
                              const SizedBox(width: 6),
                              const Icon(Icons.lock, size: 16),
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
                          builder: (context) => const RegisterScreen(),
                        ),
                      );
                    },
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'Register here',
                          style: GoogleFonts.inter(color: AppColors.textLight),
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
        ),
      ),
    );
  }
}
