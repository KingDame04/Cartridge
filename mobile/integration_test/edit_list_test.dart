// Run with: flutter test integration_test/edit_list_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:mobile/screens/edit_list_screen.dart';
import 'package:mobile/services/api_service.dart';

import 'helpers/fake_backend.dart';
import 'helpers/test_app.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  tearDown(() {
    ApiService.testClient = null;
    ApiService.authState = null;
  });

  testWidgets('renames a list', (tester) async {
    final backend = FakeBackend()..seedList(name: 'Favorites');
    await loginAndReachHome(tester, backend);

    await goToTab(tester, 'Lists');
    expect(find.text('Favorites'), findsOneWidget);

    await tester.tap(find.byIcon(Icons.edit));
    await tester.pumpAndSettle();

    await tester.enterText(fieldWithLabel('List Name'), 'All-Time Favorites');
    await tester.pumpAndSettle();

    await scrollToAndTap(
      tester,
      EditListScreen,
      find.widgetWithText(ElevatedButton, 'Save Changes'),
    );

    expect(find.text('All-Time Favorites'), findsOneWidget);
    expect(backend.lists.single['name'], 'All-Time Favorites');
  });
}
