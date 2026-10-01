import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:mobile/main.dart';
import 'package:mobile/services/api_service.dart';
import 'package:mobile/services/auth_state.dart';

import 'fake_backend.dart';

// Boots the real app, logs in through the actual Login screen (every network
// call answered by [backend]), and leaves the tester sitting on the Home
// tab. Every flow test starts from here, exactly like a real user session.
Future<void> loginAndReachHome(
  WidgetTester tester,
  FakeBackend backend,
) async {
  SharedPreferences.setMockInitialValues({});
  ApiService.testClient = MockClient(backend.handle);

  final authState = AuthState();
  ApiService.authState = authState;

  await tester.pumpWidget(
    ChangeNotifierProvider.value(value: authState, child: const MyApp()),
  );

  // AuthGate's auto-login check resolves (no saved session) to the splash screen
  await tester.pumpAndSettle();
  await tester.tap(find.text('Log In'));
  await tester.pumpAndSettle();

  // Login screen: email field then password field, in that order
  await tester.enterText(find.byType(TextField).at(0), 'player@example.com');
  await tester.enterText(find.byType(TextField).at(1), 'Sup3rSecret!1');
  await tester.pumpAndSettle();

  await tester.tap(find.text('Sign In'));
  await tester.pumpAndSettle();

  expect(find.text('Recently Added Games'), findsOneWidget);
}

// Taps a bottom-nav destination by its label (Home/Collection/Lists/Settings).
Future<void> goToTab(WidgetTester tester, String label) async {
  await tester.tap(find.text(label));
  await tester.pumpAndSettle();
}

// Finds a TextField by its labelText. MainNavScreen's IndexedStack keeps
// every tab mounted at once (e.g. Settings' 7 fields sit in the tree even
// while looking at Collection), so find.byType(TextField).first/.at(n) can
// silently grab the wrong field — matching by label sidesteps that entirely.
Finder fieldWithLabel(String label) => find.byWidgetPredicate(
  (widget) => widget is TextField && widget.decoration?.labelText == label,
);

// Scrolls the given screen's own Scrollable until [target] is visible, then
// taps it. Several screens (GameEntryFormScreen, GameDetailScreen,
// CreateListScreen, EditListScreen, SettingsScreen) render their content via
// a plain `ListView(children: [...])`, which is still Sliver-backed and lazy
// about *building* far-off-screen children — even though every child was
// handed to it up front. A button below the fold (e.g. the final submit/
// action button after a long form) may simply not exist in the widget tree
// yet, so a plain find+tap silently fails to locate it; this scrolls it into
// existence first. [screenType] scopes the search to that screen's own
// Scrollable, since IndexedStack keeps every tab's Scrollable mounted too.
Future<void> scrollToAndTap(
  WidgetTester tester,
  Type screenType,
  Finder target,
) async {
  await scrollIntoView(tester, screenType, target);
  await tester.tap(target);
  await tester.pumpAndSettle();
}

// Same lazy-ListView scrolling as [scrollToAndTap], without the tap —
// for asserting on a Text/widget that may sit below the fold.
Future<void> scrollIntoView(
  WidgetTester tester,
  Type screenType,
  Finder target,
) async {
  // .first: TextFields have their own internal Scrollable for their text,
  // so a plain descendant search matches those too — the outer ListView's
  // Scrollable is built (and so traversed) before any of its list items'.
  final scrollable = find
      .descendant(of: find.byType(screenType), matching: find.byType(Scrollable))
      .first;
  await tester.scrollUntilVisible(target, 200, scrollable: scrollable);
  await tester.pumpAndSettle();
}
