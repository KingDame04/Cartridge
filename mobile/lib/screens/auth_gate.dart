import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_state.dart';
import 'splash_screen.dart';
import 'main_nav_screen.dart';

// Root widget: waits for the saved-login check, then shows the
// dashboard if logged in or the splash screen otherwise.
class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  bool _checkingAuth = true;

  // Kick off the saved-login check
  @override
  void initState() {
    super.initState();
    _checkAuth();
  }

  // See if a token is already saved on disk from a previous session
  Future<void> _checkAuth() async {
    final authState = Provider.of<AuthState>(context, listen: false);
    await authState.tryAutoLogin();
    if (mounted) {
      setState(() {
        _checkingAuth = false;
      });
    }
  }

  // Screen contents
  @override
  Widget build(BuildContext context) {
    if (_checkingAuth) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Consumer<AuthState>(
      builder: (context, authState, child) {
        return authState.isLoggedIn ? const MainNavScreen() : const SplashScreen();
      },
    );
  }
}
