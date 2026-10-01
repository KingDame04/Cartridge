import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/models/collection_filters.dart';
import 'package:mobile/widgets/filter_bottom_sheet.dart';

void main() {
  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  Map<String, dynamic> entry({
    String? listId,
    bool played = false,
    String? releaseDate,
    List<String> developers = const [],
    List<String> genres = const [],
  }) {
    return {
      'listIds': listId == null ? <String>[] : [listId],
      'played': played,
      'releaseDate': releaseDate,
      'developers': developers,
      'genres': genres,
    };
  }

  Widget buildSheet({
    CollectionFilters current = const CollectionFilters(),
    List<Map<String, dynamic>> entries = const [],
    List<MapEntry<String, String>> availableLists = const [],
    required ValueChanged<CollectionFilters> onChanged,
  }) {
    return MaterialApp(
      home: Scaffold(
        body: FilterBottomSheet(
          current: current,
          entries: entries,
          availableLists: availableLists,
          onChanged: onChanged,
        ),
      ),
    );
  }

  testWidgets('pre-fills checkbox state from the current filters', (tester) async {
    await tester.pumpWidget(buildSheet(
      current: const CollectionFilters(developers: {'Nintendo'}),
      entries: [
        entry(developers: const ['Nintendo']),
        entry(developers: const ['Sony']),
      ],
      onChanged: (_) {},
    ));

    final tiles = tester
        .widgetList<CheckboxListTile>(find.byType(CheckboxListTile))
        .toList();
    final nintendoTile = tiles.firstWhere((t) => (t.title as Text).data == 'Nintendo');
    final sonyTile = tiles.firstWhere((t) => (t.title as Text).data == 'Sony');

    expect(nintendoTile.value, isTrue);
    expect(sonyTile.value, isFalse);
  });

  testWidgets('hides the release year slider when there is no spread of years', (tester) async {
    await tester.pumpWidget(buildSheet(
      entries: [
        entry(releaseDate: '2020-01-01'),
        entry(releaseDate: '2020-06-01'),
      ],
      onChanged: (_) {},
    ));

    expect(find.byType(RangeSlider), findsNothing);
  });

  testWidgets('shows the release year slider when there is a real range', (tester) async {
    await tester.pumpWidget(buildSheet(
      entries: [
        entry(releaseDate: '1990-01-01'),
        entry(releaseDate: '2024-01-01'),
      ],
      onChanged: (_) {},
    ));

    expect(find.byType(RangeSlider), findsOneWidget);
  });

  testWidgets('"Clear All" immediately emits a fully-default CollectionFilters', (tester) async {
    CollectionFilters? emitted;

    await tester.pumpWidget(buildSheet(
      current: const CollectionFilters(developers: {'Nintendo'}),
      entries: [entry(developers: const ['Nintendo'])],
      onChanged: (filters) => emitted = filters,
    ));

    await tester.tap(find.text('Clear All'));
    await tester.pumpAndSettle();

    expect(emitted, isNotNull);
    expect(emitted!.isEmpty, isTrue);
  });

  testWidgets('toggling a developer checkbox emits it immediately, with no Apply button', (
    tester,
  ) async {
    CollectionFilters? emitted;

    await tester.pumpWidget(buildSheet(
      entries: [
        entry(developers: const ['Nintendo']),
        entry(developers: const ['Sony']),
      ],
      onChanged: (filters) => emitted = filters,
    ));

    expect(find.text('Apply Filters'), findsNothing);

    await tester.tap(find.text('Sony'));
    await tester.pumpAndSettle();

    expect(emitted, isNotNull);
    expect(emitted!.developers, {'Sony'});
  });

  testWidgets('selecting a developer narrows the genre options to that developer\'s games', (
    tester,
  ) async {
    await tester.pumpWidget(buildSheet(
      entries: [
        entry(developers: const ['Nintendo'], genres: const ['Platformer']),
        entry(developers: const ['Sony'], genres: const ['Shooter']),
      ],
      onChanged: (_) {},
    ));

    expect(find.text('Platformer'), findsOneWidget);
    expect(find.text('Shooter'), findsOneWidget);

    await tester.tap(find.text('Nintendo'));
    await tester.pumpAndSettle();

    expect(find.text('Platformer'), findsOneWidget);
    expect(find.text('Shooter'), findsNothing);
  });

  testWidgets('Belongs to List always shows every list, even ones filtered out elsewhere', (
    tester,
  ) async {
    await tester.pumpWidget(buildSheet(
      entries: [
        entry(listId: 'list-1', developers: const ['Nintendo']),
        entry(listId: 'list-2', developers: const ['Sony']),
      ],
      availableLists: const [
        MapEntry('list-1', 'Favorites'),
        MapEntry('list-2', 'Backlog'),
      ],
      onChanged: (_) {},
    ));

    await tester.tap(find.text('Nintendo'));
    await tester.pumpAndSettle();

    expect(find.text('Favorites'), findsOneWidget);
    expect(find.text('Backlog'), findsOneWidget);
  });

  testWidgets('hides "Played" option when other filters leave only unplayed games visible', (
    tester,
  ) async {
    await tester.pumpWidget(buildSheet(
      entries: [
        entry(developers: const ['Nintendo'], played: false),
        entry(developers: const ['Sony'], played: true),
      ],
      onChanged: (_) {},
    ));

    expect(find.text('Played'), findsOneWidget);
    expect(find.text('Not Yet Played'), findsOneWidget);

    await tester.tap(find.text('Nintendo'));
    await tester.pumpAndSettle();

    expect(find.text('Played'), findsNothing);
    expect(find.text('Not Yet Played'), findsOneWidget);
  });

  testWidgets('release year range narrows to the currently filtered games\' actual range', (
    tester,
  ) async {
    await tester.pumpWidget(buildSheet(
      entries: [
        entry(developers: const ['Nintendo'], releaseDate: '1990-01-01'),
        entry(developers: const ['Sony'], releaseDate: '2024-01-01'),
      ],
      onChanged: (_) {},
    ));

    expect(find.textContaining('1990 - 2024'), findsOneWidget);

    await tester.tap(find.text('Nintendo'));
    await tester.pumpAndSettle();

    expect(find.byType(RangeSlider), findsNothing);
  });
}
