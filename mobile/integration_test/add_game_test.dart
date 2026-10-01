// Run with: flutter test integration_test/add_game_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:mobile/screens/game_entry_form_screen.dart';
import 'package:mobile/services/api_service.dart';

import 'helpers/fake_backend.dart';
import 'helpers/test_app.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  tearDown(() {
    ApiService.testClient = null;
    ApiService.authState = null;
  });

  testWidgets('adds a game manually and shows it in the Collection tab', (
    tester,
  ) async {
    final backend = FakeBackend();
    await loginAndReachHome(tester, backend);

    await goToTab(tester, 'Collection');
    expect(find.text('No games in your collection yet.'), findsOneWidget);

    await tester.tap(find.text('Add Game'));
    await tester.pumpAndSettle();

    // Bypass RAWG search entirely — the manual-entry path
    await tester.tap(find.text('New Game Entry'));
    await tester.pumpAndSettle();

    await tester.enterText(fieldWithLabel('Game Name'), 'Chrono Trigger');
    await tester.pumpAndSettle();

    await tester.tap(find.widgetWithText(ElevatedButton, 'Continue'));
    await tester.pumpAndSettle();

    await scrollToAndTap(
      tester,
      GameEntryFormScreen,
      find.widgetWithText(ElevatedButton, 'Add to Collection'),
    );

    // Back on the Collection grid, showing the newly added card
    expect(find.text('Chrono Trigger'), findsOneWidget);
    expect(backend.entries, hasLength(1));
    expect(backend.entries.single['gameId']['name'], 'Chrono Trigger');
  });
}
