import 'dart:async';
import 'package:app_links/app_links.dart';
import 'package:flutter/material.dart';
import 'package:flutter_web_plugins/url_strategy.dart';
import 'package:provider/provider.dart';
import 'services/auth_state.dart';
import 'services/api_service.dart';
import 'screens/auth_gate.dart';
import 'screens/reset_pw_screen.dart';
import 'screens/verify_email_confirm_screen.dart';
import 'utils/navigator_key.dart';

void main() {
  // So web links look like /reset-password?token=... instead of /#/reset-password?token=...
  usePathUrlStrategy();

  // Constructed here (rather than via ChangeNotifierProvider's create)
  // so it can also be handed to ApiService for the sliding-session token
  // refresh — every API call updates this same instance directly.
  final authState = AuthState();
  ApiService.authState = authState;

  runApp(
    ChangeNotifierProvider.value(
      value: authState,
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  final _appLinks = AppLinks();
  StreamSubscription<Uri>? _linkSubscription;

  @override
  void initState() {
    super.initState();

    // Cold start (app launched by tapping the link) is already handled by
    // Flutter's own engine-level deep-linking, which feeds the link's full
    // path+query into onGenerateRoute's initial route below — no need to
    // also handle it here via app_links' getInitialLink(), which would
    // double-push the same screen on top of itself.
    //
    // Warm start (app already running when the link is tapped) isn't
    // covered by that mechanism, so it's handled here instead.
    _linkSubscription = _appLinks.uriLinkStream.listen(_handleIncomingLink);
  }

  @override
  void dispose() {
    _linkSubscription?.cancel();
    super.dispose();
  }

  // Routes an incoming Android App Link (e.g. a tapped password-reset email)
  // to the matching screen, same destinations as onGenerateRoute below.
  void _handleIncomingLink(Uri uri) {
    if (uri.path == '/reset-password') {
      navigatorKey.currentState?.push(
        MaterialPageRoute(
          builder: (context) =>
              ResetPasswordScreen(token: uri.queryParameters['token']),
        ),
      );
    } else if (uri.path == '/verify-email') {
      navigatorKey.currentState?.push(
        MaterialPageRoute(
          builder: (context) => VerifyEmailConfirmScreen(
            token: uri.queryParameters['token'],
          ),
        ),
      );
    }
  }

  // App-wide routing: send /reset-password links (with their ?token=...)
  // to the reset screen, everything else through AuthGate
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorKey: navigatorKey,
      title: 'Cartridge',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      onGenerateRoute: (settings) {
        final uri = Uri.parse(settings.name ?? '/');
        if (uri.path == '/reset-password') {
          return MaterialPageRoute(
            builder: (context) =>
                ResetPasswordScreen(token: uri.queryParameters['token']),
          );
        }
        if (uri.path == '/verify-email') {
          return MaterialPageRoute(
            builder: (context) =>
                VerifyEmailConfirmScreen(token: uri.queryParameters['token']),
          );
        }
        //return MaterialPageRoute(builder: (context) => const AuthGate());
        return MaterialPageRoute(
          builder: (context) => const AuthGate(),
        ); // Change AuthGate()); to whatever screen you wanna test out and comment out the previous line for testing
      },
    );
  }
}
