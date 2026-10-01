import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

// To notify listeners
class AuthState extends ChangeNotifier {
  // Private variables
  String? _token;
  String? _userId;
  String? _email;
  String? _pendingEmail; // set while a new email is awaiting SendGrid re-verification
  String? _rememberedEmail; // pre-fills the login screen's email field, if "Remember me" was checked

  // Allows for a read-only way to access private vars from outside the AuthState class
  String? get token => _token;
  String? get userId => _userId;
  String? get email => _email;
  String? get pendingEmail => _pendingEmail;
  String? get rememberedEmail => _rememberedEmail;

  // Checks for if user is logged in or not
  bool get isLoggedIn => _token != null;

  // Stores the login info inside AuthState upon login
  // Saves on disk so if app closes, we remember the login until user manually logs out
  Future<void> login(String token, String userId, String email) async {
    _token = token;
    _userId = userId;
    _email = email;
    notifyListeners();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', token);
    await prefs.setString('userId', userId);
    await prefs.setString('email', email);
  }

  // Applies a sliding-session refreshed token (see ApiService), silently
  // replacing the stored one — the user stays logged in without noticing
  // as long as they keep using the app.
  Future<void> updateToken(String token) async {
    _token = token;
    notifyListeners();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', token);
  }

  // Called once the primary email is confirmed to have actually changed
  // (i.e. after Settings re-fetches the profile and sees a new value)
  Future<void> updateEmail(String email) async {
    _email = email;
    notifyListeners();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('email', email);
  }

  // Drives the "please verify your new email" banner; null once verified/cleared
  Future<void> setPendingEmail(String? pendingEmail) async {
    _pendingEmail = pendingEmail;
    notifyListeners();

    final prefs = await SharedPreferences.getInstance();
    if (pendingEmail == null) {
      await prefs.remove('pendingEmail');
    } else {
      await prefs.setString('pendingEmail', pendingEmail);
    }
  }

  // Saves (or clears) the email the login screen should pre-fill next time.
  // Deliberately email-only, never the password — storing a raw password on
  // device just to save a bit of typing isn't a trade worth making.
  Future<void> setRememberedEmail(String? email) async {
    _rememberedEmail = email;
    notifyListeners();

    final prefs = await SharedPreferences.getInstance();
    if (email == null) {
      await prefs.remove('rememberedEmail');
    } else {
      await prefs.setString('rememberedEmail', email);
    }
  }

  // Removed stored info upon logout
  // Updates info on disc for logout permanence
  Future<void> logout() async {
    _token = null;
    _userId = null;
    _email = null;
    _pendingEmail = null;
    notifyListeners();

    // Preserved across the wipe below — "remember me" is meant to survive
    // logout, that's the whole point of it.
    final prefs = await SharedPreferences.getInstance();
    final rememberedEmail = prefs.getString('rememberedEmail');
    await prefs.clear();
    if (rememberedEmail != null) {
      await prefs.setString('rememberedEmail', rememberedEmail);
    }
  }

  Future<void> tryAutoLogin() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    final userId = prefs.getString('userId');
    final email = prefs.getString('email');
    final pendingEmail = prefs.getString('pendingEmail');
    _rememberedEmail = prefs.getString('rememberedEmail');

    if (token != null && userId != null && email != null) {
      _token = token;
      _userId = userId;
      _email = email;
      _pendingEmail = pendingEmail;
    }
    notifyListeners();
  }
}