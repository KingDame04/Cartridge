import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/widgets/list_card.dart';

void main() {
  Widget wrap(Widget child) => MaterialApp(home: Scaffold(body: child));

  testWidgets('renders the title', (tester) async {
    await tester.pumpWidget(wrap(const ListCard(title: 'My Favorites')));

    expect(find.text('My Favorites'), findsOneWidget);
  });

  testWidgets('shows 4 placeholder icons when there are no cover images', (tester) async {
    await tester.pumpWidget(wrap(const ListCard(title: 'Empty List')));

    expect(find.byIcon(Icons.image_not_supported), findsNWidgets(4));
  });

  testWidgets('pads with placeholders when fewer than 4 covers are given', (tester) async {
    await tester.pumpWidget(
      wrap(const ListCard(title: 'Partial List', coverImages: ['https://img/a.png'])),
    );

    expect(find.byIcon(Icons.image_not_supported), findsNWidgets(3));
  });

  testWidgets('hides the edit button when onEdit is not provided', (tester) async {
    await tester.pumpWidget(wrap(const ListCard(title: 'No Edit')));

    expect(find.byIcon(Icons.edit), findsNothing);
  });

  testWidgets('shows the edit button when onEdit is provided', (tester) async {
    await tester.pumpWidget(wrap(ListCard(title: 'Editable', onEdit: () {})));

    expect(find.byIcon(Icons.edit), findsOneWidget);
  });

  testWidgets('invokes onTap when the card body is tapped', (tester) async {
    var tapped = false;
    await tester.pumpWidget(
      wrap(ListCard(title: 'Tap Me', onTap: () => tapped = true)),
    );

    await tester.tap(find.text('Tap Me'));

    expect(tapped, isTrue);
  });

  testWidgets('invokes onEdit (not onTap) when the edit icon is tapped', (tester) async {
    var editTapped = false;
    var cardTapped = false;
    await tester.pumpWidget(
      wrap(ListCard(
        title: 'Edit Target',
        onTap: () => cardTapped = true,
        onEdit: () => editTapped = true,
      )),
    );

    await tester.tap(find.byIcon(Icons.edit));

    expect(editTapped, isTrue);
    expect(cardTapped, isFalse);
  });
}
