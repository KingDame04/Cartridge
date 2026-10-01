import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/widgets/game_card.dart';

void main() {
  Widget wrap(Widget child) => MaterialApp(home: Scaffold(body: child));

  testWidgets('shows "Not rated yet." when rating is null', (tester) async {
    await tester.pumpWidget(wrap(const GameCard(title: 'Unrated Game')));

    expect(find.text('Not rated yet.'), findsOneWidget);
  });

  testWidgets('shows "Not rated yet." when rating is exactly 0', (tester) async {
    await tester.pumpWidget(wrap(const GameCard(title: 'Zero Rating', rating: 0)));

    expect(find.text('Not rated yet.'), findsOneWidget);
  });

  testWidgets('shows 3 filled stars and 2 empty stars for a rating of 3', (tester) async {
    await tester.pumpWidget(wrap(const GameCard(title: 'Rated Game', rating: 3)));

    expect(find.byIcon(Icons.star), findsNWidgets(3));
    expect(find.byIcon(Icons.star_border), findsNWidgets(2));
  });

  testWidgets('rounds a fractional rating before filling stars', (tester) async {
    await tester.pumpWidget(wrap(const GameCard(title: 'Rounded Game', rating: 3.6)));

    // 3.6 rounds to 4
    expect(find.byIcon(Icons.star), findsNWidgets(4));
    expect(find.byIcon(Icons.star_border), findsNWidgets(1));
  });

  testWidgets('hides the platform line entirely when platformPlayed is null', (tester) async {
    await tester.pumpWidget(wrap(const GameCard(title: 'No Platform')));

    expect(find.textContaining('hrs'), findsNothing);
  });

  testWidgets('shows just the platform when hoursPlayed is null', (tester) async {
    await tester.pumpWidget(
      wrap(const GameCard(title: 'Platform Only', platformPlayed: 'PC')),
    );

    expect(find.text('PC'), findsOneWidget);
  });

  testWidgets('shows platform + rounded hours when hoursPlayed is set', (tester) async {
    await tester.pumpWidget(
      wrap(const GameCard(
        title: 'Platform And Hours',
        platformPlayed: 'PC',
        hoursPlayed: 45,
      )),
    );

    expect(find.text('PC • 45 hrs'), findsOneWidget);
  });

  testWidgets('keeps a fractional hour count as-is', (tester) async {
    await tester.pumpWidget(
      wrap(const GameCard(
        title: 'Fractional Hours',
        platformPlayed: 'PC',
        hoursPlayed: 12.5,
      )),
    );

    expect(find.text('PC • 12.5 hrs'), findsOneWidget);
  });

  testWidgets('invokes onTap when tapped', (tester) async {
    var tapped = false;
    await tester.pumpWidget(
      wrap(GameCard(title: 'Tap Me', onTap: () => tapped = true)),
    );

    await tester.tap(find.byType(GameCard));

    expect(tapped, isTrue);
  });
}
