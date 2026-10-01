import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/widgets/initial_avatar.dart';

void main() {
  Widget wrap(Widget child) => MaterialApp(home: Scaffold(body: child));

  testWidgets('shows the uppercased first letter', (tester) async {
    await tester.pumpWidget(
      wrap(const InitialAvatar(seed: 'judhy', letter: 'judhy')),
    );

    expect(find.text('J'), findsOneWidget);
  });

  testWidgets('shows "?" when letter is empty', (tester) async {
    await tester.pumpWidget(wrap(const InitialAvatar(seed: 'seed', letter: '')));

    expect(find.text('?'), findsOneWidget);
  });

  testWidgets('two avatars with the same seed pick the same color', (tester) async {
    await tester.pumpWidget(
      wrap(const Column(
        children: [
          InitialAvatar(seed: 'sameSeed', letter: 'A'),
          InitialAvatar(seed: 'sameSeed', letter: 'B'),
        ],
      )),
    );

    final avatars = tester.widgetList<CircleAvatar>(find.byType(CircleAvatar)).toList();
    expect(avatars[0].backgroundColor, avatars[1].backgroundColor);
  });

  testWidgets('an empty seed does not crash and picks a color', (tester) async {
    await tester.pumpWidget(wrap(const InitialAvatar(seed: '', letter: 'Z')));

    final avatar = tester.widget<CircleAvatar>(find.byType(CircleAvatar));
    expect(avatar.backgroundColor, isNotNull);
  });

  testWidgets('respects a custom radius', (tester) async {
    await tester.pumpWidget(
      wrap(const InitialAvatar(seed: 'seed', letter: 'A', radius: 20)),
    );

    final avatar = tester.widget<CircleAvatar>(find.byType(CircleAvatar));
    expect(avatar.radius, 20);
  });
}
