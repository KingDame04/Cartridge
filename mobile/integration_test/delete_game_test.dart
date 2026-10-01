// Run with: flutter test integration_test/delete_game_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:mobile/screens/collection_screen.dart';
import 'package:mobile/screens/game_detail_screen.dart';
import 'package:mobile/services/api_service.dart';

import 'helpers/fake_backend.dart';
import 'helpers/test_app.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  tearDown(() {
    ApiService.testClient = null;
    ApiService.authState = null;
  });

  testWidgets('deletes a game entry from its detail screen', (tester) async {
    final backend = FakeBackend()..seedEntry(name: 'Chrono Trigger');
    await loginAndReachHome(tester, backend);

    await goToTab(tester, 'Collection');
    await scrollToAndTap(
      tester,
      CollectionScreen,
      find.text('Chrono Trigger'),
    );

    await scrollToAndTap(
      tester,
      GameDetailScreen,
      find.widgetWithText(ElevatedButton, 'Delete'),
    );

    // Confirmation dialog — its "Delete" is a TextButton, distinct from the
    // ElevatedButton behind it that shares the same label
    await tester.tap(find.widgetWithText(TextButton, 'Delete'));
    await tester.pumpAndSettle();

    expect(find.text('No games in your collection yet.'), findsOneWidget);
    expect(backend.entries, isEmpty);
  });
}
