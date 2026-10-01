import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/constants/app_colors.dart';
import '../services/api_service.dart';
import '../services/auth_state.dart';
import '../widgets/app_header_logo.dart';
import '../widgets/initial_avatar.dart';
import 'splash_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _usernameController = TextEditingController();
  final _emailController = TextEditingController();
  final _profilePictureController = TextEditingController();
  final _bioController = TextEditingController();
  final _currentPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmNewPasswordController = TextEditingController();
  final _deletePasswordController = TextEditingController();
  final _newPasswordFocusNode = FocusNode();

  String _originalUsername = '';
  String _originalEmail = '';
  String _originalProfilePicture = '';
  String _originalBio = '';

  bool? _usernameAvailable; // null = unchanged / not yet checked
  bool _isCheckingUsername = false;
  Timer? _usernameDebounce;

  String? _newPasswordError;
  String? _passwordMismatch;

  bool _isLoadingProfile = true;
  bool _isSaving = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _usernameController.addListener(_onUsernameChanged);
    _emailController.addListener(_onFieldChanged);
    _profilePictureController.addListener(_onFieldChanged);
    _bioController.addListener(_onFieldChanged);
    _currentPasswordController.addListener(_onFieldChanged);
    _newPasswordController.addListener(_onFieldChanged);
    _confirmNewPasswordController.addListener(_checkPasswordsMatch);
    _newPasswordFocusNode.addListener(_validateNewPasswordOnBlur);
    _loadProfile();
  }

  void _onFieldChanged() => setState(() {});

  @override
  void dispose() {
    _usernameController.removeListener(_onUsernameChanged);
    _emailController.removeListener(_onFieldChanged);
    _profilePictureController.removeListener(_onFieldChanged);
    _bioController.removeListener(_onFieldChanged);
    _currentPasswordController.removeListener(_onFieldChanged);
    _newPasswordController.removeListener(_onFieldChanged);
    _confirmNewPasswordController.removeListener(_checkPasswordsMatch);
    _newPasswordFocusNode.removeListener(_validateNewPasswordOnBlur);

    _usernameDebounce?.cancel();
    _usernameController.dispose();
    _emailController.dispose();
    _profilePictureController.dispose();
    _bioController.dispose();
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmNewPasswordController.dispose();
    _deletePasswordController.dispose();
    _newPasswordFocusNode.dispose();
    super.dispose();
  }

  // Loads the current username/email (AuthState only tracks the confirmed
  // email, not username) and refreshes the pending-email banner state
  Future<void> _loadProfile() async {
    setState(() {
      _isLoadingProfile = true;
      _errorMessage = null;
    });

    try {
      final authState = Provider.of<AuthState>(context, listen: false);
      final apiService = ApiService();
      final response = await apiService.get('/auth/me', token: authState.token);

      if (!mounted) return;

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _originalUsername = data['username']?.toString() ?? '';
          _usernameController.text = _originalUsername;
          _originalEmail = data['email']?.toString() ?? '';
          _emailController.text = _originalEmail;
          _originalProfilePicture = data['profilePicture']?.toString() ?? '';
          _profilePictureController.text = _originalProfilePicture;
          _originalBio = data['bio']?.toString() ?? '';
          _bioController.text = _originalBio;
        });

        final pendingEmail = data['pendingEmail']?.toString();
        await authState.setPendingEmail(
          (pendingEmail != null && pendingEmail.isNotEmpty)
              ? pendingEmail
              : null,
        );
        if (data['email'] != null && data['email'] != authState.email) {
          await authState.updateEmail(data['email'].toString());
        }
      } else {
        setState(() {
          _errorMessage = 'Could not load your profile. Please try again.';
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Could not load your profile. Please try again.';
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoadingProfile = false;
        });
      }
    }
  }

  bool get _usernameChanged =>
      _usernameController.text.trim().isNotEmpty &&
      _usernameController.text.trim() != _originalUsername;

  bool get _emailChanged =>
      _emailController.text.trim().isNotEmpty &&
      _emailController.text.trim() != _originalEmail;

  bool get _profilePictureChanged =>
      _profilePictureController.text.trim() != _originalProfilePicture;

  bool get _bioChanged => _bioController.text.trim() != _originalBio;

  bool get _wantsPasswordChange =>
      _currentPasswordController.text.isNotEmpty ||
      _newPasswordController.text.isNotEmpty ||
      _confirmNewPasswordController.text.isNotEmpty;

  // Debounced real-time username availability check
  void _onUsernameChanged() {
    setState(() {
      _usernameAvailable = null;
    });
    _usernameDebounce?.cancel();

    final candidate = _usernameController.text.trim();
    if (candidate.isEmpty || candidate == _originalUsername) return;

    _usernameDebounce = Timer(
      const Duration(milliseconds: 450),
      () => _checkUsernameAvailability(candidate),
    );
  }

  Future<void> _checkUsernameAvailability(String candidate) async {
    setState(() => _isCheckingUsername = true);

    try {
      final authState = Provider.of<AuthState>(context, listen: false);
      final apiService = ApiService();
      final response = await apiService.get(
        '/auth/checkUsername?username=${Uri.encodeQueryComponent(candidate)}',
        token: authState.token,
      );

      if (!mounted) return;

      // Ignore stale responses if the user kept typing
      if (_usernameController.text.trim() != candidate) return;

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() => _usernameAvailable = data['available'] == true);
      }
    } catch (e) {
      // Save will still re-validate server-side; no need to surface this
    } finally {
      if (mounted) setState(() => _isCheckingUsername = false);
    }
  }

  // Make sure the new password matches its confirmation field
  void _checkPasswordsMatch() {
    setState(() {
      if (_confirmNewPasswordController.text.isEmpty) {
        _passwordMismatch = null;
      } else if (_newPasswordController.text !=
          _confirmNewPasswordController.text) {
        _passwordMismatch = 'Passwords don\'t match';
      } else {
        _passwordMismatch = null;
      }
    });
  }

  void _validateNewPasswordOnBlur() {
    if (!_newPasswordFocusNode.hasFocus &&
        _newPasswordController.text.isNotEmpty) {
      setState(() {
        _newPasswordError = _getPasswordError(_newPasswordController.text);
      });
    }
  }

  String? _getPasswordError(String password) {
    if (password.length < 8 || password.length > 14) {
      return 'Password must be 8-14 characters';
    }
    if (!password.contains(RegExp(r'[A-Z]'))) {
      return 'Password must contain an uppercase letter';
    }
    if (!password.contains(RegExp(r'[a-z]'))) {
      return 'Password must contain a lowercase letter';
    }
    if (!password.contains(RegExp(r'[0-9]'))) {
      return 'Password must contain a number';
    }
    if (!password.contains(RegExp(r'[!@#$%^&*(),.?":{}|<>]'))) {
      return 'Password must contain a special character';
    }
    return null;
  }

  bool _isFormValid() {
    if (_usernameChanged && _usernameAvailable != true) return false;
    if (_emailChanged &&
        !RegExp(
          r'^[\w\.-]+@[\w\.-]+\.\w+$',
        ).hasMatch(_emailController.text.trim())) {
      return false;
    }
    if (_wantsPasswordChange) {
      if (_currentPasswordController.text.isEmpty) return false;
      if (_getPasswordError(_newPasswordController.text) != null) return false;
      if (_newPasswordController.text != _confirmNewPasswordController.text)
        return false;
    }
    return _usernameChanged ||
        _emailChanged ||
        _wantsPasswordChange ||
        _profilePictureChanged ||
        _bioChanged;
  }

  Future<void> _handleSave() async {
    setState(() {
      _isSaving = true;
      _errorMessage = null;
    });

    final accountBody = <String, dynamic>{};
    if (_usernameChanged)
      accountBody['newUsername'] = _usernameController.text.trim();
    if (_emailChanged) accountBody['newEmail'] = _emailController.text.trim();
    if (_wantsPasswordChange) {
      accountBody['currentPassword'] = _currentPasswordController.text;
      accountBody['newPassword'] = _newPasswordController.text;
      accountBody['confirmNewPassword'] = _confirmNewPasswordController.text;
    }

    // Set below if this save actually triggers a new pending-email
    // verification, so the confirmation message can call that out
    // explicitly instead of a generic "Settings saved."
    var emailVerificationSent = false;

    final profileBody = <String, dynamic>{};
    if (_profilePictureChanged) {
      profileBody['newProfilePicture'] = _profilePictureController.text.trim();
    }
    if (_bioChanged) profileBody['newBio'] = _bioController.text.trim();

    try {
      final authState = Provider.of<AuthState>(context, listen: false);
      final apiService = ApiService();

      if (accountBody.isNotEmpty) {
        final response = await apiService.put(
          '/auth/account',
          accountBody,
          token: authState.token,
        );

        if (!mounted) return;

        if (response.statusCode != 200) {
          final data = jsonDecode(response.body);
          setState(() {
            _errorMessage =
                data['message'] ??
                data['error'] ??
                'Could not save changes. Please try again.';
          });
          return;
        }

        final data = jsonDecode(response.body);
        final user = data['user'] as Map<String, dynamic>?;

        _originalUsername =
            user?['username']?.toString() ?? _usernameController.text.trim();
        _usernameController.text = _originalUsername;

        final pendingEmail = data['pendingEmail']?.toString();
        emailVerificationSent = pendingEmail != null && pendingEmail.isNotEmpty;
        await authState.setPendingEmail(
          emailVerificationSent ? pendingEmail : null,
        );
        if (user?['email'] != null) {
          _originalEmail = user!['email'].toString();
          _emailController.text = _originalEmail;
          if (user['email'] != authState.email) {
            await authState.updateEmail(user['email'].toString());
          }
        }

        _currentPasswordController.clear();
        _newPasswordController.clear();
        _confirmNewPasswordController.clear();
      }

      if (profileBody.isNotEmpty) {
        final response = await apiService.put(
          '/auth/profile',
          profileBody,
          token: authState.token,
        );

        if (!mounted) return;

        if (response.statusCode != 200) {
          final data = jsonDecode(response.body);
          setState(() {
            _errorMessage =
                data['message'] ??
                data['error'] ??
                'Could not save changes. Please try again.';
          });
          return;
        }

        final data = jsonDecode(response.body);
        final user = data['user'] as Map<String, dynamic>?;

        _originalProfilePicture =
            user?['profilePicture']?.toString() ??
            _profilePictureController.text.trim();
        _profilePictureController.text = _originalProfilePicture;
        _originalBio = user?['bio']?.toString() ?? _bioController.text.trim();
        _bioController.text = _originalBio;
      }

      if (!mounted) return;
      setState(() {
        _usernameAvailable = null;
        _newPasswordError = null;
        _passwordMismatch = null;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            emailVerificationSent
                ? 'Settings saved. Check your new email address for a link to confirm the change — it won\'t take effect until then.'
                : 'Settings saved.',
            style: GoogleFonts.inter(),
          ),
          duration: emailVerificationSent
              ? const Duration(seconds: 6)
              : const Duration(seconds: 4),
        ),
      );
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Something went wrong. Please try again.';
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSaving = false;
        });
      }
    }
  }

  void _goToSplash() {
    // rootNavigator: true — this screen now lives inside the Settings tab's
    // own nested Navigator (so the bottom nav bar stays put while browsing),
    // but logging out needs to replace the whole app shell, not just this
    // tab's stack.
    Navigator.of(context, rootNavigator: true).pushAndRemoveUntil(
      MaterialPageRoute(builder: (context) => const SplashScreen()),
      (route) => false,
    );
  }

  Future<void> _handleLogout() async {
    final authState = Provider.of<AuthState>(context, listen: false);
    await authState.logout();
    if (!mounted) return;
    _goToSplash();
  }

  Future<void> _handleDeleteAccount() async {
    _deletePasswordController.clear();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Delete Account?', style: GoogleFonts.inter()),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'This permanently deletes your account, collection, and lists. This cannot be undone.',
              style: GoogleFonts.inter(),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _deletePasswordController,
              obscureText: true,
              style: GoogleFonts.inter(),
              cursorColor: AppColors.darkGreen,
              decoration: InputDecoration(
                labelText: 'Current Password',
                labelStyle: GoogleFonts.inter(),
                floatingLabelStyle: GoogleFonts.inter(
                  color: AppColors.darkGreen,
                ),
                border: const OutlineInputBorder(),
                focusedBorder: const OutlineInputBorder(
                  borderSide: BorderSide(color: AppColors.darkGreen, width: 2),
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(
              'Cancel',
              style: GoogleFonts.inter(color: AppColors.darkGreen),
            ),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(
              'Delete',
              style: GoogleFonts.inter(color: AppColors.darkGreen),
            ),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    if (_deletePasswordController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Please enter your password to confirm.',
            style: GoogleFonts.inter(),
          ),
        ),
      );
      return;
    }

    setState(() => _isSaving = true);

    try {
      final authState = Provider.of<AuthState>(context, listen: false);
      final apiService = ApiService();
      final response = await apiService.delete(
        '/auth/account',
        token: authState.token,
        body: {'currentPassword': _deletePasswordController.text},
      );

      if (!mounted) return;

      if (response.statusCode == 200 || response.statusCode == 204) {
        await authState.logout();
        if (!mounted) return;
        _goToSplash();
      } else {
        setState(() => _isSaving = false);
        String message = 'Could not delete account. Please try again.';
        try {
          final data = jsonDecode(response.body);
          if (data['message'] != null) message = data['message'];
        } catch (_) {
          // Keep the generic message
        }
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(message, style: GoogleFonts.inter())),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSaving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Something went wrong. Please try again.',
              style: GoogleFonts.inter(),
            ),
          ),
        );
      }
    }
  }

  Widget _buildAvatar() {
    if (_originalProfilePicture.isEmpty) {
      return InitialAvatar(
        seed: _originalUsername,
        letter: _originalUsername,
        radius: 40,
      );
    }
    return ClipOval(
      child: Image.network(
        _originalProfilePicture,
        width: 80,
        height: 80,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) => InitialAvatar(
          seed: _originalUsername,
          letter: _originalUsername,
          radius: 40,
        ),
      ),
    );
  }

  Widget _usernameSuffixIcon() {
    if (!_usernameChanged) return const SizedBox.shrink();
    if (_isCheckingUsername) {
      return const Padding(
        padding: EdgeInsets.all(14),
        child: SizedBox(
          height: 16,
          width: 16,
          child: CircularProgressIndicator(
            strokeWidth: 2,
            color: AppColors.darkGreen,
          ),
        ),
      );
    }
    if (_usernameAvailable == true) {
      return const Icon(Icons.check_circle, color: Colors.green);
    }
    if (_usernameAvailable == false) {
      return const Icon(Icons.cancel, color: Colors.red);
    }
    return const SizedBox.shrink();
  }

  // A white input box whose border turns dark green (instead of the app's
  // default purple theme color) when focused
  InputDecoration _fieldDecoration(
    String label, {
    Widget? suffixIcon,
    String? errorText,
    String? helperText,
    int? helperMaxLines,
  }) {
    return InputDecoration(
      labelText: label,
      labelStyle: GoogleFonts.inter(),
      floatingLabelStyle: GoogleFonts.inter(color: AppColors.darkGreen),
      helperText: helperText,
      helperMaxLines: helperMaxLines,
      helperStyle: GoogleFonts.inter(fontSize: 12),
      errorText: errorText,
      errorStyle: GoogleFonts.inter(fontSize: 12),
      suffixIcon: suffixIcon,
      border: const OutlineInputBorder(),
      focusedBorder: const OutlineInputBorder(
        borderSide: BorderSide(color: AppColors.darkGreen, width: 2),
      ),
    );
  }

  // Screen contents
  @override
  Widget build(BuildContext context) {
    final pendingEmail = context.watch<AuthState>().pendingEmail;

    final hasChanges = _isFormValid();

    return Scaffold(
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(76),
        child: Container(
          height: 76,
          color: AppColors.darkGreen,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: SafeArea(
            bottom: false,
            child: Align(
              alignment: Alignment.topLeft,
              child: const AppHeaderLogo(),
            ),
          ),
        ),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Account Settings',
                style: GoogleFonts.vt323(
                  fontSize: 30,
                  color: AppColors.darkGreen,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
          Expanded(
            child: _isLoadingProfile
                ? const Center(
                    child: CircularProgressIndicator(
                      color: AppColors.lightGreen,
                    ),
                  )
                : Theme(
                    data: Theme.of(context).copyWith(
                      textSelectionTheme: TextSelectionThemeData(
                        cursorColor: AppColors.darkGreen,
                        selectionColor: AppColors.lightGreen.withOpacity(0.4),
                        selectionHandleColor: AppColors.lightGreen,
                      ),
                    ),
                    child: ListView(
                      padding: const EdgeInsets.all(16.0),
                      children: [
                        Center(child: _buildAvatar()),
                        const SizedBox(height: 24),
                        TextField(
                          controller: _usernameController,
                          style: GoogleFonts.inter(),
                          cursorColor: AppColors.darkGreen,
                          decoration: _fieldDecoration(
                            'Username',
                            suffixIcon: _usernameSuffixIcon(),
                            errorText:
                                _usernameChanged && _usernameAvailable == false
                                ? 'That username is taken'
                                : null,
                          ),
                        ),
                        const SizedBox(height: 16),
                        TextField(
                          controller: _profilePictureController,
                          style: GoogleFonts.inter(),
                          cursorColor: AppColors.darkGreen,
                          decoration: _fieldDecoration('Profile Picture URL'),
                        ),
                        const SizedBox(height: 16),
                        TextField(
                          controller: _bioController,
                          maxLines: 3,
                          style: GoogleFonts.inter(),
                          cursorColor: AppColors.darkGreen,
                          decoration: _fieldDecoration(
                            'Bio',
                          ).copyWith(alignLabelWithHint: true),
                        ),
                        const SizedBox(height: 24),
                        Text(
                          'Change Password',
                          style: GoogleFonts.inter(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _currentPasswordController,
                          obscureText: true,
                          style: GoogleFonts.inter(),
                          cursorColor: AppColors.darkGreen,
                          decoration: _fieldDecoration('Current Password'),
                        ),
                        const SizedBox(height: 16),
                        TextField(
                          controller: _newPasswordController,
                          focusNode: _newPasswordFocusNode,
                          obscureText: true,
                          style: GoogleFonts.inter(),
                          cursorColor: AppColors.darkGreen,
                          decoration: _fieldDecoration(
                            'New Password',
                            helperText:
                                '8-14 characters, 1 uppercase letter, 1 lowercase letter, 1 number, 1 special character',
                            helperMaxLines: 2,
                            errorText: _newPasswordError,
                          ),
                        ),
                        const SizedBox(height: 16),
                        TextField(
                          controller: _confirmNewPasswordController,
                          obscureText: true,
                          style: GoogleFonts.inter(),
                          cursorColor: AppColors.darkGreen,
                          decoration: _fieldDecoration(
                            'Confirm New Password',
                            errorText: _passwordMismatch,
                          ),
                        ),
                        const SizedBox(height: 24),
                        TextField(
                          controller: _emailController,
                          style: GoogleFonts.inter(),
                          cursorColor: AppColors.darkGreen,
                          decoration: _fieldDecoration(
                            'Email Address',
                            helperText: pendingEmail != null
                                ? 'Pending verification: $pendingEmail'
                                : null,
                            helperMaxLines: 2,
                          ),
                        ),
                        const SizedBox(height: 16),
                        if (_errorMessage != null)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 16),
                            child: Text(
                              _errorMessage!,
                              style: GoogleFonts.inter(color: Colors.red),
                            ),
                          ),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.lightGreen,
                            foregroundColor: AppColors.darkGreen,
                            disabledBackgroundColor: Colors.grey[300],
                            disabledForegroundColor: Colors.grey[600],
                          ),
                          onPressed: (_isSaving || !hasChanges)
                              ? null
                              : _handleSave,
                          child: _isSaving
                              ? const SizedBox(
                                  height: 20,
                                  width: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: AppColors.darkGreen,
                                  ),
                                )
                              : Text(
                                  'Save',
                                  style: GoogleFonts.inter(
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                        ),
                        const SizedBox(height: 24),
                        const Divider(),
                        const SizedBox(height: 8),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.darkGreen,
                            foregroundColor: AppColors.textLight,
                          ),
                          onPressed: _isSaving ? null : _handleLogout,
                          child: Text(
                            'Logout',
                            style: GoogleFonts.inter(
                              color: AppColors.textLight,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        OutlinedButton(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.red,
                            side: const BorderSide(color: Colors.red),
                          ),
                          onPressed: _isSaving ? null : _handleDeleteAccount,
                          child: Text(
                            'Delete Account',
                            style: GoogleFonts.inter(),
                          ),
                        ),
                      ],
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}
