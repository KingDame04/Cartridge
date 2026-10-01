import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/widgets/error_message.dart';

void main() {
  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  Widget wrap(Widget child) => MaterialApp(home: Scaffold(body: child));

  testWidgets('renders the given message and an error icon', (tester) async {
    await tester.pumpWidget(wrap(const ErrorMessage(message: 'Something broke')));

    expect(find.text('Something broke'), findsOneWidget);
    expect(find.byIcon(Icons.error_outline), findsOneWidget);
  });

  testWidgets('respects a custom textAlign', (tester) async {
    await tester.pumpWidget(
      wrap(const ErrorMessage(message: 'Centered', textAlign: TextAlign.center)),
    );

    final text = tester.widget<Text>(find.text('Centered'));
    expect(text.textAlign, TextAlign.center);
  });
}
