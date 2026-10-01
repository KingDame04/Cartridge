// Run with: flutter test integration_test/edit_game_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:mobile/screens/collection_screen.dart';
import 'package:mobile/screens/game_detail_screen.dart';
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

  testWidgets("edits a game entry's hours played from its detail screen", (
    tester,
  ) async {
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
      find.widgetWithText(ElevatedButton, 'Edit'),
    );

    await tester.enterText(fieldWithLabel('Hours Played'), '12');
    await tester.pumpAndSettle();

    await scrollToAndTap(
      tester,
      GameEntryFormScreen,
      find.widgetWithText(ElevatedButton, 'Save Changes'),
    );

    // Save pops all the way back to the Collection grid — reopen the card
    // to confirm the patched value actually stuck server-side
    await scrollToAndTap(
      tester,
      CollectionScreen,
      find.text('Chrono Trigger'),
    );

    await scrollIntoView(
      tester,
      GameDetailScreen,
      find.text('Hours Played: 12'),
    );
    expect(find.text('Hours Played: 12'), findsOneWidget);
    expect(backend.entries.single['hoursPlayed'], 12);
  });
}
