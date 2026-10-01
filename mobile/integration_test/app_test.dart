// Full-app smoke test: boots the real MyApp widget tree (not an isolated
// screen), logs in through the actual Login screen, and confirms it lands on
// the real Home tab. This is the kind of navigation + API-wiring path the
// widget tests under test/ don't exercise, since those pump individual
// screens/widgets in isolation.
//
// Run with: flutter test integration_test/app_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:mobile/services/api_service.dart';

import 'helpers/fake_backend.dart';
import 'helpers/test_app.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  tearDown(() {
    ApiService.testClient = null;
    ApiService.authState = null;
  });

  testWidgets('logs in and lands on the Home tab', (tester) async {
    await loginAndReachHome(tester, FakeBackend());
  });
}
