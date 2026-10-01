// Smoke test: confirms the app boots to the splash screen for a logged-out
// user with no saved session, without throwing during the initial auth check.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:mobile/screens/auth_gate.dart';
import 'package:mobile/screens/splash_screen.dart';
import 'package:mobile/services/auth_state.dart';

void main() {
  testWidgets('AuthGate shows the splash screen when no session is saved', (
    WidgetTester tester,
  ) async {
    SharedPreferences.setMockInitialValues({});

    await tester.pumpWidget(
      ChangeNotifierProvider(
        create: (_) => AuthState(),
        child: const MaterialApp(home: AuthGate()),
      ),
    );

    // AuthGate shows a spinner while tryAutoLogin() resolves
    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    await tester.pumpAndSettle();

    expect(find.byType(SplashScreen), findsOneWidget);
  });
}
