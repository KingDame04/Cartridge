import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/constants/app_colors.dart';
import '../services/api_service.dart';
import '../widgets/error_message.dart';
import 'login_screen.dart';

// Reached via the emailed verification link (?token=...). Confirms the
// token with the backend, then lets the user head back to Login.
class VerifyEmailConfirmScreen extends StatefulWidget {
  // Passed in directly when opened via an Android App Link; left null on
  // web, where the token is read out of the page's own URL instead.
  final String? token;

  const VerifyEmailConfirmScreen({super.key, this.token});

  @override
  State<VerifyEmailConfirmScreen> createState() => _VerifyEmailConfirmScreenState();
}

class _VerifyEmailConfirmScreenState extends State<VerifyEmailConfirmScreen> {
  String? _token;
  bool _isVerifying = true;
  bool _success = false;
  String? _message;

  // Read the token out of the URL, then confirm it right away
  @override
  void initState() {
    super.initState();
    _token = widget.token ?? Uri.base.queryParameters['token'];
    if (_token == null) {
      _isVerifying = false;
      _message = 'This verification link is invalid or has expired.';
    } else {
      _verifyEmail();
    }
  }

  Future<void> _verifyEmail() async {
    try {
      final apiService = ApiService();
      final response = await apiService.get(
        '/auth/verifyEmail?token=${Uri.encodeQueryComponent(_token!)}',
      );

      if (!mounted) return;

      if (response.statusCode == 200) {
        setState(() {
          _success = true;
          _message = 'Email verified! You may now log in.';
        });
      } else {
        setState(() {
          _success = false;
          _message = 'This verification link is invalid or has expired.';
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _success = false;
          _message = 'Something went wrong. Please try again.';
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isVerifying = false;
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
            children: _isVerifying
                ? const [Center(child: CircularProgressIndicator())]
                : [
                    Center(
                      child: _success
                          ? Text(
                              _message ?? '',
                              textAlign: TextAlign.center,
                              style: GoogleFonts.inter(
                                color: AppColors.textLight,
                                fontWeight: FontWeight.bold,
                              ),
                            )
                          : ErrorMessage(
                              message: _message ?? '',
                              textAlign: TextAlign.center,
                            ),
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFE0E0E0),
                        foregroundColor: Colors.black54,
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
                  ],
          ),
        ),
      ),
    );
  }
}
