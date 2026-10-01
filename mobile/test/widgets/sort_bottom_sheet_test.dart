import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/models/collection_sort_option.dart';
import 'package:mobile/widgets/sort_bottom_sheet.dart';

void main() {
  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  testWidgets('renders a labeled radio tile per option', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SortBottomSheet<CollectionSortOption>(
            selected: CollectionSortOption.titleAZ,
            options: CollectionSortOption.values,
            labelBuilder: (o) => o.label,
          ),
        ),
      ),
    );

    for (final option in CollectionSortOption.values) {
      expect(find.text(option.label), findsOneWidget);
    }
  });

  testWidgets('pops with the tapped option', (tester) async {
    Future<CollectionSortOption?>? resultFuture;

    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => ElevatedButton(
            onPressed: () {
              resultFuture = Navigator.of(context).push<CollectionSortOption>(
                MaterialPageRoute(
                  builder: (_) => Scaffold(
                    body: SortBottomSheet<CollectionSortOption>(
                      selected: CollectionSortOption.titleAZ,
                      options: CollectionSortOption.values,
                      labelBuilder: (o) => o.label,
                    ),
                  ),
                ),
              );
            },
            child: const Text('Open'),
          ),
        ),
      ),
    );
    await tester.tap(find.text('Open'));
    await tester.pumpAndSettle();

    await tester.tap(find.text(CollectionSortOption.ratingHighToLow.label));
    await tester.pumpAndSettle();

    expect(await resultFuture, CollectionSortOption.ratingHighToLow);
  });
}
