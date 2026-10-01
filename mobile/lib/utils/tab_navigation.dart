import 'package:flutter/material.dart';

// Lets any screen jump back to the Home tab's root, no matter how deeply
// nested it is within another tab's own navigation stack — screens pushed
// within a tab (e.g. via that tab's own Navigator) have no direct way to
// reach up to MainNavScreen otherwise. Set once by MainNavScreen at
// startup, kept in its own file (like navigator_key.dart) so screens don't
// need to import MainNavScreen itself just to tap the header logo.
VoidCallback? goToHomeTab;
