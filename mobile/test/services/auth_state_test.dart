import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mobile/services/auth_state.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  group('initial state', () {
    test('starts logged out with everything null', () {
      final authState = AuthState();

      expect(authState.isLoggedIn, isFalse);
      expect(authState.token, isNull);
      expect(authState.userId, isNull);
      expect(authState.email, isNull);
      expect(authState.pendingEmail, isNull);
      expect(authState.rememberedEmail, isNull);
    });
  });

  group('login', () {
    test('sets token/userId/email, flips isLoggedIn, and notifies listeners', () async {
      final authState = AuthState();
      var notified = 0;
      authState.addListener(() => notified++);

      await authState.login('tok123', 'user1', 'a@b.com');

      expect(authState.token, 'tok123');
      expect(authState.userId, 'user1');
      expect(authState.email, 'a@b.com');
      expect(authState.isLoggedIn, isTrue);
      expect(notified, greaterThan(0));
    });

    test('persists login info to disk for a later tryAutoLogin', () async {
      final authState = AuthState();
      await authState.login('tok123', 'user1', 'a@b.com');

      final restored = AuthState();
      await restored.tryAutoLogin();

      expect(restored.token, 'tok123');
      expect(restored.userId, 'user1');
      expect(restored.email, 'a@b.com');
      expect(restored.isLoggedIn, isTrue);
    });
  });

  group('updateToken', () {
    test('replaces only the token, leaving other fields untouched', () async {
      final authState = AuthState();
      await authState.login('oldTok', 'user1', 'a@b.com');

      await authState.updateToken('newTok');

      expect(authState.token, 'newTok');
      expect(authState.userId, 'user1');
      expect(authState.email, 'a@b.com');
    });

    test('persists the refreshed token to disk', () async {
      final authState = AuthState();
      await authState.login('oldTok', 'user1', 'a@b.com');
      await authState.updateToken('newTok');

      final restored = AuthState();
      await restored.tryAutoLogin();

      expect(restored.token, 'newTok');
    });
  });

  group('updateEmail', () {
    test('replaces only the email', () async {
      final authState = AuthState();
      await authState.login('tok', 'user1', 'old@b.com');

      await authState.updateEmail('new@b.com');

      expect(authState.email, 'new@b.com');
      expect(authState.token, 'tok');
    });
  });

  group('setPendingEmail', () {
    // pendingEmail is only ever set while the user is authenticated (via an
    // account-settings email change), and tryAutoLogin only restores it
    // alongside a full saved session — so these tests log in first, matching
    // how the app actually uses it.
    test('sets and persists a pending email', () async {
      final authState = AuthState();
      await authState.login('tok', 'user1', 'a@b.com');

      await authState.setPendingEmail('pending@b.com');

      expect(authState.pendingEmail, 'pending@b.com');

      final restored = AuthState();
      await restored.tryAutoLogin();
      expect(restored.pendingEmail, 'pending@b.com');
    });

    test('clearing with null removes it from disk too', () async {
      final authState = AuthState();
      await authState.login('tok', 'user1', 'a@b.com');
      await authState.setPendingEmail('pending@b.com');

      await authState.setPendingEmail(null);

      expect(authState.pendingEmail, isNull);

      final restored = AuthState();
      await restored.tryAutoLogin();
      expect(restored.pendingEmail, isNull);
    });
  });

  group('setRememberedEmail', () {
    test('sets and persists the remembered email', () async {
      final authState = AuthState();

      await authState.setRememberedEmail('remember@b.com');

      final restored = AuthState();
      await restored.tryAutoLogin();
      expect(restored.rememberedEmail, 'remember@b.com');
    });

    test('clearing with null removes it from disk', () async {
      final authState = AuthState();
      await authState.setRememberedEmail('remember@b.com');

      await authState.setRememberedEmail(null);

      final restored = AuthState();
      await restored.tryAutoLogin();
      expect(restored.rememberedEmail, isNull);
    });
  });

  group('logout', () {
    test('clears token/userId/email/pendingEmail and notifies listeners', () async {
      final authState = AuthState();
      await authState.login('tok', 'user1', 'a@b.com');
      await authState.setPendingEmail('pending@b.com');
      var notified = 0;
      authState.addListener(() => notified++);

      await authState.logout();

      expect(authState.token, isNull);
      expect(authState.userId, isNull);
      expect(authState.email, isNull);
      expect(authState.pendingEmail, isNull);
      expect(authState.isLoggedIn, isFalse);
      expect(notified, greaterThan(0));
    });

    test('preserves rememberedEmail across the disk wipe', () async {
      final authState = AuthState();
      await authState.login('tok', 'user1', 'a@b.com');
      await authState.setRememberedEmail('remember@b.com');

      await authState.logout();

      expect(authState.rememberedEmail, 'remember@b.com');

      final restored = AuthState();
      await restored.tryAutoLogin();
      expect(restored.rememberedEmail, 'remember@b.com');
      expect(restored.isLoggedIn, isFalse);
    });

    test('does not resurrect a rememberedEmail that was never set', () async {
      final authState = AuthState();
      await authState.login('tok', 'user1', 'a@b.com');

      await authState.logout();

      final restored = AuthState();
      await restored.tryAutoLogin();
      expect(restored.rememberedEmail, isNull);
    });
  });

  group('tryAutoLogin', () {
    test('leaves isLoggedIn false when only some fields are present on disk', () async {
      SharedPreferences.setMockInitialValues({
        'token': 'tok',
        // userId and email deliberately missing
      });

      final authState = AuthState();
      await authState.tryAutoLogin();

      expect(authState.isLoggedIn, isFalse);
    });

    test('loads rememberedEmail even when there is no saved session', () async {
      SharedPreferences.setMockInitialValues({'rememberedEmail': 'remember@b.com'});

      final authState = AuthState();
      await authState.tryAutoLogin();

      expect(authState.isLoggedIn, isFalse);
      expect(authState.rememberedEmail, 'remember@b.com');
    });

    test('notifies listeners even when there is nothing to restore', () async {
      final authState = AuthState();
      var notified = 0;
      authState.addListener(() => notified++);

      await authState.tryAutoLogin();

      expect(notified, greaterThan(0));
    });
  });
}
