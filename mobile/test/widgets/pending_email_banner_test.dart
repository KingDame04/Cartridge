import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/widgets/pending_email_banner.dart';

void main() {
  testWidgets('shows the pending email in its message', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(body: PendingEmailBanner(pendingEmail: 'new@b.com')),
      ),
    );

    expect(
      find.textContaining('new@b.com'),
      findsOneWidget,
    );
    expect(find.byIcon(Icons.info_outline), findsOneWidget);
  });
}
