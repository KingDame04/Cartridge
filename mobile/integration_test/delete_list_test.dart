// Run with: flutter test integration_test/delete_list_test.dart
import 'package:flutter/material.dart';
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

  testWidgets('deletes a list', (tester) async {
    final backend = FakeBackend()..seedList(name: 'Favorites');
    await loginAndReachHome(tester, backend);

    await goToTab(tester, 'Lists');
    await tester.tap(find.byIcon(Icons.edit));
    await tester.pumpAndSettle();

    await tester.tap(find.widgetWithText(ElevatedButton, 'Delete List'));
    await tester.pumpAndSettle();

    // Confirmation dialog — its "Delete" is a TextButton, distinct from the
    // "Delete List" ElevatedButton behind it
    await tester.tap(find.widgetWithText(TextButton, 'Delete'));
    await tester.pumpAndSettle();

    expect(find.text('No lists yet.'), findsOneWidget);
    expect(backend.lists, isEmpty);
  });
}
