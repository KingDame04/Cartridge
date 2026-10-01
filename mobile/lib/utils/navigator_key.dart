import 'package:flutter/material.dart';

// Shared by main.dart (as MaterialApp's navigatorKey, e.g. for the Android
// App Link handler) and ApiService (to force a logout-redirect on an
// expired/invalid session) — kept in its own file so neither has to import
// the other.
final navigatorKey = GlobalKey<NavigatorState>();
