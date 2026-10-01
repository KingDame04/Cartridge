// Run with: flutter test integration_test/add_list_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:mobile/screens/create_list_screen.dart';
import 'package:mobile/services/api_service.dart';

import 'helpers/fake_backend.dart';
import 'helpers/test_app.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  tearDown(() {
    ApiService.testClient = null;
    ApiService.authState = null;
  });

  testWidgets('creates a list with a selected game', (tester) async {
    final backend = FakeBackend()..seedEntry(name: 'Chrono Trigger');
    await loginAndReachHome(tester, backend);

    await goToTab(tester, 'Lists');
    expect(find.text('No lists yet.'), findsOneWidget);

    await tester.tap(find.text('Add List'));
    await tester.pumpAndSettle();

    await tester.enterText(fieldWithLabel('List Name'), 'Favorites');
    await tester.pumpAndSettle();

    await scrollToAndTap(
      tester,
      CreateListScreen,
      find.widgetWithText(CheckboxListTile, 'Chrono Trigger'),
    );

    await scrollToAndTap(
      tester,
      CreateListScreen,
      find.widgetWithText(ElevatedButton, 'Create List'),
    );

    expect(find.text('Favorites'), findsOneWidget);
    expect(backend.lists, hasLength(1));
    expect(
      backend.entries.single['listIds'],
      contains(backend.lists.single['_id']),
    );
  });
}
