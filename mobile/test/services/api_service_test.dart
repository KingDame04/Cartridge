import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:mobile/screens/splash_screen.dart';
import 'package:mobile/services/api_service.dart';
import 'package:mobile/services/auth_state.dart';
import 'package:mobile/utils/navigator_key.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
    ApiService.authState = null;
  });

  group('get()', () {
    test('hits baseUrl + endpoint with no Authorization header by default', () async {
      late http.Request captured;
      final client = MockClient((request) async {
        captured = request;
        return http.Response('{}', 200);
      });

      await ApiService(client: client).get('/games/search');

      expect(captured.url.toString(), 'https://cartridgeapp.fun/api/games/search');
      expect(captured.headers.containsKey('Authorization'), isFalse);
    });

    test('adds a Bearer Authorization header when a token is given', () async {
      late http.Request captured;
      final client = MockClient((request) async {
        captured = request;
        return http.Response('{}', 200);
      });

      await ApiService(client: client).get('/auth/me', token: 'abc123');

      expect(captured.headers['Authorization'], 'Bearer abc123');
    });
  });

  group('post()/put()/patch()', () {
    test('post() JSON-encodes the body and sets Content-Type', () async {
      late http.Request captured;
      final client = MockClient((request) async {
        captured = request;
        return http.Response('{}', 201);
      });

      await ApiService(client: client).post('/auth/login', {'email': 'a@b.com'});

      expect(captured.headers['Content-Type'], 'application/json');
      expect(jsonDecode(captured.body), {'email': 'a@b.com'});
    });

    test('put() JSON-encodes the body', () async {
      late http.Request captured;
      final client = MockClient((request) async {
        captured = request;
        return http.Response('{}', 200);
      });

      await ApiService(client: client).put('/auth/account', {'newUsername': 'foo'});

      expect(jsonDecode(captured.body), {'newUsername': 'foo'});
      expect(captured.method, 'PUT');
    });

    test('patch() JSON-encodes the body', () async {
      late http.Request captured;
      final client = MockClient((request) async {
        captured = request;
        return http.Response('{}', 200);
      });

      await ApiService(client: client).patch('/user-game-entries/collection/1', {'rating': 5});

      expect(jsonDecode(captured.body), {'rating': 5});
      expect(captured.method, 'PATCH');
    });
  });

  group('delete()', () {
    test('sends no body or Content-Type header when none is given', () async {
      late http.Request captured;
      final client = MockClient((request) async {
        captured = request;
        return http.Response('{}', 200);
      });

      await ApiService(client: client).delete('/user-game-entries/1');

      expect(captured.headers.containsKey('Content-Type'), isFalse);
      expect(captured.body, isEmpty);
    });

    test('sends a JSON body and Content-Type header when a body is given', () async {
      late http.Request captured;
      final client = MockClient((request) async {
        captured = request;
        return http.Response('{}', 200);
      });

      await ApiService(client: client).delete(
        '/auth/account',
        body: {'currentPassword': 'pw'},
      );

      expect(captured.headers['Content-Type'], 'application/json');
      expect(jsonDecode(captured.body), {'currentPassword': 'pw'});
    });
  });

  group('sliding-session token refresh', () {
    test('applies a refreshed token from the response header to authState', () async {
      final authState = AuthState();
      await authState.login('oldTok', 'user1', 'a@b.com');
      ApiService.authState = authState;

      final client = MockClient((request) async {
        return http.Response('{}', 200, headers: {'x-refreshed-token': 'newTok'});
      });

      await ApiService(client: client).get('/auth/me', token: 'oldTok');

      expect(authState.token, 'newTok');
    });

    test('leaves the token untouched when the header is absent', () async {
      final authState = AuthState();
      await authState.login('oldTok', 'user1', 'a@b.com');
      ApiService.authState = authState;

      final client = MockClient((request) async => http.Response('{}', 200));

      await ApiService(client: client).get('/auth/me', token: 'oldTok');

      expect(authState.token, 'oldTok');
    });
  });

  group('auto-logout on session failure', () {
    test('logs out on a 401 when the request carried a token', () async {
      final authState = AuthState();
      await authState.login('oldTok', 'user1', 'a@b.com');
      ApiService.authState = authState;

      final client = MockClient((request) async => http.Response('{}', 401));

      await ApiService(client: client).get('/auth/me', token: 'oldTok');

      expect(authState.isLoggedIn, isFalse);
    });

    test('logs out on a 403 when the request carried a token', () async {
      final authState = AuthState();
      await authState.login('oldTok', 'user1', 'a@b.com');
      ApiService.authState = authState;

      final client = MockClient((request) async => http.Response('{}', 403));

      await ApiService(client: client).get('/auth/me', token: 'oldTok');

      expect(authState.isLoggedIn, isFalse);
    });

    test('does NOT log out on a 403 with no token (e.g. login\'s own unverified-account response)', () async {
      final authState = AuthState();
      await authState.login('oldTok', 'user1', 'a@b.com');
      ApiService.authState = authState;

      final client = MockClient((request) async => http.Response('{}', 403));

      // No token passed — this simulates the public /auth/login call, whose
      // own 403 (unverified account) must never be mistaken for a dead session.
      await ApiService(client: client).post('/auth/login', {'email': 'a@b.com', 'password': 'x'});

      expect(authState.isLoggedIn, isTrue);
    });

    test('does not error when authState was never set', () async {
      final client = MockClient((request) async => http.Response('{}', 401));

      await expectLater(
        ApiService(client: client).get('/auth/me', token: 'tok'),
        completes,
      );
    });

    test('a healthy 200 response never triggers logout', () async {
      final authState = AuthState();
      await authState.login('oldTok', 'user1', 'a@b.com');
      ApiService.authState = authState;

      final client = MockClient((request) async => http.Response('{}', 200));

      await ApiService(client: client).get('/auth/me', token: 'oldTok');

      expect(authState.isLoggedIn, isTrue);
    });

    testWidgets('redirects to the splash screen on session death', (tester) async {
      final authState = AuthState();
      await authState.login('oldTok', 'user1', 'a@b.com');
      ApiService.authState = authState;

      await tester.pumpWidget(
        MaterialApp(
          navigatorKey: navigatorKey,
          home: const Scaffold(body: Text('Protected Screen')),
        ),
      );
      expect(find.text('Protected Screen'), findsOneWidget);

      final client = MockClient((request) async => http.Response('{}', 401));
      await ApiService(client: client).get('/auth/me', token: 'oldTok');
      await tester.pumpAndSettle();

      expect(find.byType(SplashScreen), findsOneWidget);
    });
  });
}
