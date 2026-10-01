import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../utils/constants.dart';
import '../utils/navigator_key.dart';
import '../screens/splash_screen.dart';
import 'auth_state.dart';

class ApiService {
  // Set once at app startup (see main.dart). Lets every ApiService instance
  // — constructed fresh at each call site throughout the app — silently
  // apply a sliding-session refreshed token without every call site needing
  // to wire that up individually.
  static AuthState? authState;

  // Lets a full-app test (e.g. integration_test/) stub every ApiService()
  // call across the whole widget tree with one http.MockClient, without
  // threading a client through every screen that constructs its own
  // ApiService(). Always null in production.
  static http.Client? testClient;

  // Overridable so tests can inject an http.MockClient instead of making
  // real network calls; production call sites all use the default.
  final http.Client _client;

  ApiService({http.Client? client}) : _client = client ?? testClient ?? http.Client();

  // Checks for the sliding-session refreshed token on any response and
  // applies it, so the caller never needs to think about this.
  void _applyRefreshedToken(http.Response response) {
    final refreshed = response.headers['x-refreshed-token'];
    if (refreshed != null) {
      authState?.updateToken(refreshed);
    }
  }

  // A 401/403 only means "your session is dead" when the request actually
  // carried a token in the first place — login's own 403 (unverified
  // account) is a different thing entirely and must not trigger this.
  // Logs out and drops the user back at the splash screen automatically,
  // rather than leaving them stuck seeing confusing errors until they find
  // the logout button themselves.
  void _handleAuthFailure(http.Response response, bool wasAuthenticated) {
    if (!wasAuthenticated) return;
    if (response.statusCode != 401 && response.statusCode != 403) return;
    final state = authState;
    if (state == null || !state.isLoggedIn) return;

    state.logout();
    navigatorKey.currentState?.pushAndRemoveUntil(
      MaterialPageRoute(builder: (context) => const SplashScreen()),
      (route) => false,
    );
  }

  // get()
  Future<http.Response> get(String endpoint, {String? token}) async {
    final url = Uri.parse('${ApiConstants.baseUrl}$endpoint');
    final headers = <String, String>{};
    if (token != null) {
      headers['Authorization'] = 'Bearer $token';
    }
    final response = await _client.get(url, headers: headers);
    _applyRefreshedToken(response);
    _handleAuthFailure(response, token != null);
    return response;
  }

  // post()
  Future<http.Response> post(String endpoint, Map<String, dynamic> body, {String? token}) async {
    final url = Uri.parse('${ApiConstants.baseUrl}$endpoint');
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (token != null) {
      headers['Authorization'] = 'Bearer $token';
    }
    final response = await _client.post(
      url,
      headers: headers,
      body: jsonEncode(body),
    );
    _applyRefreshedToken(response);
    _handleAuthFailure(response, token != null);
    return response;
  }

  // put()
  Future<http.Response> put(String endpoint, Map<String, dynamic> body, {String? token}) async {
    final url = Uri.parse('${ApiConstants.baseUrl}$endpoint');
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (token != null) {
      headers['Authorization'] = 'Bearer $token';
    }
    final response = await _client.put(
      url,
      headers: headers,
      body: jsonEncode(body)
    );
    _applyRefreshedToken(response);
    _handleAuthFailure(response, token != null);
    return response;
  }

  // patch()
  Future<http.Response> patch(String endpoint, Map<String, dynamic> body, {String? token}) async {
    final url = Uri.parse('${ApiConstants.baseUrl}$endpoint');
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (token != null) {
      headers['Authorization'] = 'Bearer $token';
    }
    final response = await _client.patch(
      url,
      headers: headers,
      body: jsonEncode(body)
    );
    _applyRefreshedToken(response);
    _handleAuthFailure(response, token != null);
    return response;
  }

  // delete()
  Future<http.Response> delete(String endpoint, {String? token, Map<String, dynamic>? body}) async {
    final url = Uri.parse('${ApiConstants.baseUrl}$endpoint');
    final headers = <String, String>{};
    if (token != null) {
      headers['Authorization'] = 'Bearer $token';
    }
    if (body != null) {
      headers['Content-Type'] = 'application/json';
    }
    final response = await _client.delete(
      url,
      headers: headers,
      body: body != null ? jsonEncode(body) : null,
    );
    _applyRefreshedToken(response);
    _handleAuthFailure(response, token != null);
    return response;
  }
}