import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/widgets/game_checklist.dart';

void main() {
  Widget wrap(Widget child) => MaterialApp(home: Scaffold(body: child));

  testWidgets('shows an empty-state message when there are no entries', (tester) async {
    await tester.pumpWidget(
      wrap(GameChecklist(entries: const [], selectedEntryIds: const {}, onToggle: (_) {})),
    );

    expect(find.text('Your collection is empty — add some games first.'), findsOneWidget);
  });

  testWidgets('renders one CheckboxListTile per entry, with names and check state', (tester) async {
    final entries = [
      {'entryId': 'e1', 'name': 'Chrono Trigger', 'coverImage': null},
      {'entryId': 'e2', 'name': 'Celeste', 'coverImage': null},
    ];

    await tester.pumpWidget(
      wrap(GameChecklist(
        entries: entries,
        selectedEntryIds: const {'e1'},
        onToggle: (_) {},
      )),
    );

    expect(find.byType(CheckboxListTile), findsNWidgets(2));
    expect(find.text('Chrono Trigger'), findsOneWidget);
    expect(find.text('Celeste'), findsOneWidget);

    final tiles = tester.widgetList<CheckboxListTile>(find.byType(CheckboxListTile)).toList();
    expect(tiles[0].value, isTrue); // e1 is selected
    expect(tiles[1].value, isFalse); // e2 is not
  });

  testWidgets('falls back to an empty title when name is missing', (tester) async {
    final entries = [
      {'entryId': 'e1', 'coverImage': null},
    ];

    await tester.pumpWidget(
      wrap(GameChecklist(entries: entries, selectedEntryIds: const {}, onToggle: (_) {})),
    );

    final tile = tester.widget<CheckboxListTile>(find.byType(CheckboxListTile));
    expect((tile.title as Text).data, '');
  });

  testWidgets('invokes onToggle with the tapped entry\'s ID', (tester) async {
    final entries = [
      {'entryId': 'e1', 'name': 'Chrono Trigger', 'coverImage': null},
    ];
    String? toggledId;

    await tester.pumpWidget(
      wrap(GameChecklist(
        entries: entries,
        selectedEntryIds: const {},
        onToggle: (id) => toggledId = id,
      )),
    );

    await tester.tap(find.byType(CheckboxListTile));

    expect(toggledId, 'e1');
  });
}
