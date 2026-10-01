import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/constants/app_colors.dart';
import '../services/api_service.dart';
import '../services/auth_state.dart';
import '../widgets/app_header_logo.dart';
import '../widgets/game_checklist.dart';

class EditListScreen extends StatefulWidget {
  final Map<String, dynamic> list;
  final List<Map<String, dynamic>> collectionEntries;

  const EditListScreen({
    super.key,
    required this.list,
    required this.collectionEntries,
  });

  @override
  State<EditListScreen> createState() => _EditListScreenState();
}

class _EditListScreenState extends State<EditListScreen> {
  late final TextEditingController _nameController;
  late Set<String> _selectedEntryIds;
  late Set<String>
  _initialEntryIds; // snapshot for diffing which games changed on save

  bool _isSaving = false;
  bool _isDeleting = false;
  String? _errorMessage;

  // Pre-fill from the list's current name and member games
  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(
      text: widget.list['name']?.toString() ?? '',
    );
    _nameController.addListener(_onFieldChanged);

    final listId = widget.list['listId']?.toString();
    _selectedEntryIds = widget.collectionEntries
        .where((entry) {
          final listIds =
              (entry['listIds'] as List?)?.map((id) => id.toString()).toSet() ??
              {};
          return listIds.contains(listId);
        })
        .map((entry) => entry['entryId'].toString())
        .toSet();
    _initialEntryIds = Set.from(_selectedEntryIds);
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

      // Game membership isn't part of the list-update endpoint — only the
      // name is
      final response = await apiService.patch(
        '/lists/${widget.list['listId']}',
        {'name': _nameController.text.trim()},
        token: token,
      );

      if (!mounted) return;

      if (response.statusCode != 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _errorMessage =
              data['message'] ??
              data['error'] ??
              'Could not save. Please try again.';
        });
        return;
      }

      // Sync game membership via the dedicated per-game endpoints
      final listId = widget.list['listId'];
      final added = _selectedEntryIds.difference(_initialEntryIds);
      final removed = _initialEntryIds.difference(_selectedEntryIds);
      for (final entryId in added) {
        final gameId = _gameIdForEntry(entryId);
        if (gameId != null) {
          await apiService.post(
            '/user-game-entries/lists/$listId/games/$gameId',
            {},
            token: token,
          );
        }
      }
      for (final entryId in removed) {
        final gameId = _gameIdForEntry(entryId);
        if (gameId != null) {
          await apiService.delete(
            '/user-game-entries/lists/$listId/games/$gameId',
            token: token,
          );
        }
      }

      if (!mounted) return;
      Navigator.pop(context, true);
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

  String? _gameIdForEntry(String entryId) {
    final entry = widget.collectionEntries.firstWhere(
      (e) => e['entryId']?.toString() == entryId,
      orElse: () => <String, dynamic>{},
    );
    return entry['gameId']?.toString();
  }

  Future<void> _handleDelete() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Delete List?', style: GoogleFonts.inter()),
        content: Text(
          'This will delete "${widget.list['name']}". Games stay in your collection.',
          style: GoogleFonts.inter(),
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

    setState(() => _isDeleting = true);

    try {
      final token = Provider.of<AuthState>(context, listen: false).token;
      final apiService = ApiService();
      final response = await apiService.delete(
        '/lists/${widget.list['listId']}',
        token: token,
      );

      if (!mounted) return;

      if (response.statusCode == 200 || response.statusCode == 204) {
        Navigator.pop(context, true);
      } else {
        setState(() => _isDeleting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not delete. Please try again.')),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isDeleting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Something went wrong. Please try again.'),
          ),
        );
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
                  const SizedBox(width: 8),
                  _actionButton(
                    icon: Icons.delete,
                    label: 'Delete List',
                    onPressed: _isDeleting ? null : _handleDelete,
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
                'Edit List',
                style: GoogleFonts.vt323(
                  fontSize: 30,
                  color: AppColors.darkGreen,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
          Expanded(
            child: _isDeleting
                ? const Center(
                    child: CircularProgressIndicator(
                      color: AppColors.lightGreen,
                    ),
                  )
                : Theme(
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
                          'Games in this List',
                          style: GoogleFonts.inter(
                            fontWeight: FontWeight.w600,
                          ),
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
                                  'Save Changes',
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

  // A light-green pill button used for Go Back / Delete List, matching
  // the app's dark-green-on-light-green treatment used elsewhere
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
