import 'package:flutter/material.dart';
import 'login_screen.dart';
import 'register_screen.dart';
import 'package:mobile/constants/app_colors.dart';
import 'package:google_fonts/google_fonts.dart';

class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.darkGreen,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              FittedBox(
                fit: BoxFit.scaleDown,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Image.asset(
                      'assets/images/cartridge_logo.png',
                      height: 90,
                    ),
                    const SizedBox(width: 8),
                    Image.asset('assets/images/little_logo.png', height: 75),
                  ],
                ),
              ),
              //Image.asset('assets/images/cartridge_logo.png', height: 90),
              /*const Text(
                'Cartridge',
                style: TextStyle(fontSize: 36, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ), */
              const SizedBox(height: 25),
              Text(
                'Your gaming library, all in one place.',
                style: GoogleFonts.pressStart2p(
                  fontSize: 25,
                  color: AppColors.textLight,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'Build your personal game library, organize custom lists, rate your games, and write reviews.',
                style: GoogleFonts.inter(
                  fontSize: 15,
                  color: AppColors.textLight,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.lightGreen,
                ),
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const LoginScreen(),
                    ),
                  );
                },
                child: Text(
                  'Log In',
                  style: GoogleFonts.inter(color: AppColors.textDark),
                ),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const RegisterScreen(),
                    ),
                  );
                },
                child: Text(
                  'Register',
                  style: GoogleFonts.inter(color: AppColors.textLight),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
