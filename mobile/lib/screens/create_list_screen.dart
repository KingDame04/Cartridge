import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/constants/app_colors.dart';
import '../services/api_service.dart';
import '../services/auth_state.dart';
import '../widgets/app_header_logo.dart';
import '../widgets/game_checklist.dart';

class CreateListScreen extends StatefulWidget {
  final List<Map<String, dynamic>> collectionEntries;

  const CreateListScreen({super.key, required this.collectionEntries});

  @override
  State<CreateListScreen> createState() => _CreateListScreenState();
}

class _CreateListScreenState extends State<CreateListScreen> {
  final _nameController = TextEditingController();
  final Set<String> _selectedEntryIds = {};

  bool _isSaving = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _nameController.addListener(_onFieldChanged);
  }

  void _onFieldChanged() => setState(() {});

  @override
  void dispose() {
    _nameController.removeListener(_onFieldChanged);
    _nameController.dispose();
    super.dispose();
  }

  void _toggleEntry(String entryId) {
    setState(() {
      if (_selectedEntryIds.contains(entryId)) {
        _selectedEntryIds.remove(entryId);
      } else {
        _selectedEntryIds.add(entryId);
      }
    });
  }

  Future<void> _handleSave() async {
    setState(() {
      _isSaving = true;
      _errorMessage = null;
    });

    try {
      final token = Provider.of<AuthState>(context, listen: false).token;
      final apiService = ApiService();
      final response = await apiService.post('/lists', {
        'name': _nameController.text.trim(),
        'entryIds': _selectedEntryIds.toList(),
      }, token: token);

      if (!mounted) return;

      if (response.statusCode == 200 || response.statusCode == 201) {
        Navigator.pop(context, true);
      } else {
        final data = jsonDecode(response.body);
        setState(() {
          _errorMessage =
              data['message'] ??
              data['error'] ??
              'Could not create the list. Please try again.';
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Something went wrong. Please try again.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _isSaving = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final canSave = _nameController.text.trim().isNotEmpty && !_isSaving;

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
          Container(
            color: AppColors.darkGreen,
            child: Padding(
              padding: const EdgeInsets.all(12.0),
              child: Row(
                children: [
                  _actionButton(
                    icon: Icons.arrow_back,
                    label: 'Go Back',
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'New List',
                style: GoogleFonts.vt323(
                  fontSize: 30,
                  color: AppColors.darkGreen,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
          Expanded(
            child: Theme(
              data: Theme.of(context).copyWith(
                textSelectionTheme: TextSelectionThemeData(
                  cursorColor: AppColors.darkGreen,
                  selectionColor: AppColors.darkGreen.withOpacity(0.4),
                  selectionHandleColor: AppColors.darkGreen,
                ),
              ),
              child: ListView(
                padding: const EdgeInsets.all(16.0),
                children: [
                  TextField(
                    controller: _nameController,
                    style: GoogleFonts.inter(),
                    cursorColor: AppColors.darkGreen,
                    decoration: InputDecoration(
                      labelText: 'List Name',
                      labelStyle: GoogleFonts.inter(),
                      floatingLabelStyle: GoogleFonts.inter(
                        color: AppColors.darkGreen,
                      ),
                      border: const OutlineInputBorder(),
                      focusedBorder: const OutlineInputBorder(
                        borderSide: BorderSide(
                          color: AppColors.darkGreen,
                          width: 2,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'Add Games (optional)',
                    style: GoogleFonts.inter(fontWeight: FontWeight.w600),
                  ),
                  GameChecklist(
                    entries: widget.collectionEntries,
                    selectedEntryIds: _selectedEntryIds,
                    onToggle: _toggleEntry,
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
                    ),
                    onPressed: canSave ? _handleSave : null,
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
                            'Create List',
                            style: GoogleFonts.inter(
                              color: AppColors.darkGreen,
                              fontWeight: FontWeight.w600,
                            ),
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

  // A light-green pill button used for Go Back, matching the app's
  // dark-green-on-light-green treatment used elsewhere
  Widget _actionButton({
    required IconData icon,
    required String label,
    required VoidCallback? onPressed,
  }) {
    return Expanded(
      child: ElevatedButton.icon(
        onPressed: onPressed,
        icon: Icon(icon, size: 18, color: AppColors.darkGreen),
        label: Text(
          label,
          style: GoogleFonts.inter(
            color: AppColors.darkGreen,
            fontWeight: FontWeight.w600,
          ),
        ),
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.lightGreen,
          padding: const EdgeInsets.symmetric(vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
          elevation: 0,
        ),
      ),
    );
  }
}
