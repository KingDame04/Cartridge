// Run with: flutter test integration_test/logout_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:mobile/screens/settings_screen.dart';
import 'package:mobile/services/api_service.dart';

import 'helpers/fake_backend.dart';
import 'helpers/test_app.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  tearDown(() {
    ApiService.testClient = null;
    ApiService.authState = null;
  });

  testWidgets('logs out back to the splash screen', (tester) async {
    await loginAndReachHome(tester, FakeBackend());

    await goToTab(tester, 'Settings');
    await tester.pumpAndSettle();

    await scrollToAndTap(
      tester,
      SettingsScreen,
      find.widgetWithText(ElevatedButton, 'Logout'),
    );

    expect(find.text('Log In'), findsOneWidget);
  });
}
