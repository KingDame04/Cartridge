import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/widgets/cover_card.dart';

void main() {
  Widget wrap(Widget child) => MaterialApp(home: Scaffold(body: child));

  testWidgets('renders the title text', (tester) async {
    await tester.pumpWidget(wrap(const CoverCard(title: 'Chrono Trigger')));

    expect(find.text('Chrono Trigger'), findsOneWidget);
  });

  testWidgets('shows the placeholder icon when imageUrl is null', (tester) async {
    await tester.pumpWidget(wrap(const CoverCard(title: 'No Cover')));

    expect(find.byIcon(Icons.image_not_supported), findsOneWidget);
  });

  testWidgets('shows the placeholder icon when imageUrl is empty', (tester) async {
    await tester.pumpWidget(wrap(const CoverCard(title: 'No Cover', imageUrl: '')));

    expect(find.byIcon(Icons.image_not_supported), findsOneWidget);
  });

  testWidgets('invokes onTap when tapped', (tester) async {
    var tapped = false;
    await tester.pumpWidget(
      wrap(CoverCard(title: 'Tap Me', onTap: () => tapped = true)),
    );

    // Tap the visible title text rather than CoverCard's own bounding box:
    // its GestureDetector defers hit-testing to its Column child, which
    // (being mainAxisSize.max) leaves empty, non-hit-testable space below
    // the actual card content when placed in an unconstrained-height parent
    // like this test's bare Scaffold body.
    await tester.tap(find.text('Tap Me'));

    expect(tapped, isTrue);
  });
}
