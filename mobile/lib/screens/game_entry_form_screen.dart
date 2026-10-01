import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/constants/app_colors.dart';
import '../services/api_service.dart';
import '../services/auth_state.dart';
import '../widgets/app_header_logo.dart';

// Shared form for both adding a new collection entry and editing an existing
// one. When creating, exactly one of gameId / rawgId / newGame should be
// set (rawgId/newGame get cached into a real Game first, since the entry
// endpoint needs an already-cached gameId). When editing, gameId should be
// the entry's existing game — needed for syncing list membership, since
// that isn't editable through the entry-update endpoint itself.
class GameEntryFormScreen extends StatefulWidget {
  final String? gameId;
  final String? rawgId;
  final Map<String, dynamic>? newGame;

  final String gameName;
  final String? gameCoverImage;
  final List<String> platforms;
  final List<MapEntry<String, String>> availableLists;

  // Non-null when editing an existing entry instead of creating a new one
  final String? entryId;
  final bool initialPlayed;
  final double? initialRating;
  final double? initialHoursPlayed;
  final String? initialReview;
  final String? initialPlatformPlayed;
  final Set<String> initialListIds;

  const GameEntryFormScreen({
    super.key,
    this.gameId,
    this.rawgId,
    this.newGame,
    required this.gameName,
    this.gameCoverImage,
    this.platforms = const [],
    this.availableLists = const [],
    this.entryId,
    this.initialPlayed = false,
    this.initialRating,
    this.initialHoursPlayed,
    this.initialReview,
    this.initialPlatformPlayed,
    this.initialListIds = const {},
  });

  @override
  State<GameEntryFormScreen> createState() => _GameEntryFormScreenState();
}

class _GameEntryFormScreenState extends State<GameEntryFormScreen> {
  late bool _played;
  double? _rating;
  late final TextEditingController _hoursController;
  late final TextEditingController _reviewController;
  late final TextEditingController _platformFreeTextController;
  String? _selectedPlatform;
  late Set<String> _selectedListIds;

  bool _isSaving = false;
  String? _errorMessage;

  bool get _isEditing => widget.entryId != null;

  // Load initial values (blank/defaults for create, populated for edit)
  @override
  void initState() {
    super.initState();
    _played = widget.initialPlayed;
    _rating = widget.initialRating;
    _hoursController = TextEditingController(
      text:
          (widget.initialHoursPlayed != null && widget.initialHoursPlayed != 0)
          ? widget.initialHoursPlayed.toString()
          : '',
    );
    _reviewController = TextEditingController(text: widget.initialReview ?? '');
    _platformFreeTextController = TextEditingController(
      text: widget.initialPlatformPlayed ?? '',
    );
    _selectedPlatform = widget.platforms.contains(widget.initialPlatformPlayed)
        ? widget.initialPlatformPlayed
        : null;
    _selectedListIds = Set.from(widget.initialListIds);
  }

  @override
  void dispose() {
    _hoursController.dispose();
    _reviewController.dispose();
    _platformFreeTextController.dispose();
    super.dispose();
  }

  // Create or update the entry, depending on whether entryId was passed in
  Future<void> _handleSave() async {
    setState(() {
      _isSaving = true;
      _errorMessage = null;
    });

    final platformPlayed = widget.platforms.isNotEmpty
        ? _selectedPlatform
        : _platformFreeTextController.text;

    try {
      final token = Provider.of<AuthState>(context, listen: false).token;
      final apiService = ApiService();

      if (_isEditing) {
        // List membership isn't part of the entry-update endpoint — only
        // the entry's own fields are
        final response = await apiService
            .patch('/user-game-entries/collection/${widget.entryId}', {
              'played': _played,
              'hoursPlayed': double.tryParse(_hoursController.text) ?? 0,
              'rating': _rating,
              'review': _reviewController.text,
              'platformPlayed': platformPlayed,
            }, token: token);

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

        // Sync list membership via the dedicated per-list endpoints
        if (widget.gameId != null) {
          final added = _selectedListIds.difference(widget.initialListIds);
          final removed = widget.initialListIds.difference(_selectedListIds);
          for (final listId in added) {
            await apiService.post(
              '/user-game-entries/lists/$listId/games/${widget.gameId}',
              {},
              token: token,
            );
          }
          for (final listId in removed) {
            await apiService.delete(
              '/user-game-entries/lists/$listId/games/${widget.gameId}',
              token: token,
            );
          }
        }

        if (!mounted) return;
        Navigator.pop(context, true);
      } else {
        // The entry endpoint needs an already-cached gameId — cache the
        // RAWG result or create the manual game first if needed
        String? resolvedGameId = widget.gameId;

        if (resolvedGameId == null && widget.rawgId != null) {
          final cacheResponse = await apiService.post(
            '/games/rawg/${widget.rawgId}',
            {},
            token: token,
          );
          if (cacheResponse.statusCode != 200) {
            if (!mounted) return;
            setState(() {
              _errorMessage = _extractErrorMessage(
                cacheResponse.body,
                'Could not save this game. Please try again.',
              );
            });
            return;
          }
          final cacheData = jsonDecode(cacheResponse.body);
          resolvedGameId = cacheData['game']?['_id']?.toString();
        } else if (resolvedGameId == null && widget.newGame != null) {
          final manualResponse = await apiService.post(
            '/games/manual',
            widget.newGame!,
            token: token,
          );
          if (manualResponse.statusCode != 201) {
            if (!mounted) return;
            setState(() {
              _errorMessage = _extractErrorMessage(
                manualResponse.body,
                'Could not save this game. Please try again.',
              );
            });
            return;
          }
          final manualData = jsonDecode(manualResponse.body);
          resolvedGameId = manualData['game']?['_id']?.toString();
        }

        if (resolvedGameId == null) {
          if (!mounted) return;
          setState(() {
            _errorMessage = 'Could not identify this game. Please try again.';
          });
          return;
        }

        final response = await apiService.post('/user-game-entries', {
          'gameId': resolvedGameId,
          'listIds': _selectedListIds.toList(),
          'played': _played,
          'hoursPlayed': double.tryParse(_hoursController.text) ?? 0,
          'rating': _rating,
          'review': _reviewController.text,
          'platformPlayed': platformPlayed,
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
                'Could not save. Please try again.';
          });
        }
      }
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

  // Surfaces the backend's own message/error (different routes use either
  // key) instead of a generic one, falling back if the body isn't parseable
  String _extractErrorMessage(String responseBody, String fallback) {
    try {
      final data = jsonDecode(responseBody);
      return data['message'] ?? data['error'] ?? fallback;
    } catch (_) {
      return fallback;
    }
  }

  // A white input box whose border and floating label turn dark green
  // (instead of the app's default purple theme color) when focused —
  // matches the treatment used on the Settings screen
  InputDecoration _fieldDecoration(String label) {
    return InputDecoration(
      labelText: label,
      labelStyle: GoogleFonts.inter(),
      floatingLabelStyle: GoogleFonts.inter(color: AppColors.darkGreen),
      border: const OutlineInputBorder(),
      focusedBorder: const OutlineInputBorder(
        borderSide: BorderSide(color: AppColors.darkGreen, width: 2),
      ),
    );
  }

  // Screen contents
  @override
  Widget build(BuildContext context) {
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
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => Navigator.pop(context),
                  icon: Icon(
                    Icons.arrow_back,
                    size: 18,
                    color: AppColors.darkGreen,
                  ),
                  label: Text(
                    'Go Back',
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
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                _isEditing ? 'Edit Entry' : 'Add to Collection',
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
                  selectionColor: AppColors.lightGreen.withOpacity(0.4),
                  selectionHandleColor: AppColors.lightGreen,
                ),
              ),
              child: ListView(
                padding: const EdgeInsets.all(16.0),
                children: [
                  Row(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: SizedBox(
                          width: 64,
                          height: 85,
                          child:
                              (widget.gameCoverImage == null ||
                                  widget.gameCoverImage!.isEmpty)
                              ? Container(
                                  color: Colors.grey[300],
                                  child: const Icon(Icons.image_not_supported),
                                )
                              : Image.network(
                                  widget.gameCoverImage!,
                                  fit: BoxFit.cover,
                                  errorBuilder: (context, error, stackTrace) =>
                                      Container(
                                        color: Colors.grey[300],
                                        child: const Icon(
                                          Icons.image_not_supported,
                                        ),
                                      ),
                                ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          widget.gameName,
                          style: GoogleFonts.inter(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text('Played', style: GoogleFonts.inter()),
                    value: _played,
                    activeThumbColor: AppColors.lightGreen,
                    onChanged: (value) => setState(() => _played = value),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Rating',
                    style: GoogleFonts.inter(fontWeight: FontWeight.w600),
                  ),
                  Row(
                    children: [
                      ...List.generate(5, (i) {
                        final starValue = i + 1;
                        return IconButton(
                          icon: Icon(
                            _rating != null && starValue <= _rating!
                                ? Icons.star
                                : Icons.star_border,
                            color: Colors.amber,
                          ),
                          onPressed: () =>
                              setState(() => _rating = starValue.toDouble()),
                        );
                      }),
                      if (_rating != null)
                        TextButton(
                          onPressed: () => setState(() => _rating = null),
                          child: Text('Clear', style: GoogleFonts.inter()),
                        ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _hoursController,
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                    style: GoogleFonts.inter(),
                    cursorColor: AppColors.darkGreen,
                    decoration: _fieldDecoration('Hours Played'),
                  ),
                  const SizedBox(height: 16),
                  widget.platforms.isNotEmpty
                      ? DropdownButtonFormField<String>(
                          initialValue: _selectedPlatform,
                          style: GoogleFonts.inter(color: Colors.black),
                          iconEnabledColor: AppColors.darkGreen,
                          decoration: _fieldDecoration('Platform'),
                          items: [
                            for (final platform in widget.platforms)
                              DropdownMenuItem(
                                value: platform,
                                child: Text(
                                  platform,
                                  style: GoogleFonts.inter(),
                                ),
                              ),
                          ],
                          onChanged: (value) =>
                              setState(() => _selectedPlatform = value),
                        )
                      : TextField(
                          controller: _platformFreeTextController,
                          style: GoogleFonts.inter(),
                          cursorColor: AppColors.darkGreen,
                          decoration: _fieldDecoration('Platform'),
                        ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _reviewController,
                    maxLines: 4,
                    style: GoogleFonts.inter(),
                    cursorColor: AppColors.darkGreen,
                    decoration: _fieldDecoration('Review'),
                  ),
                  const SizedBox(height: 16),
                  if (widget.availableLists.isNotEmpty) ...[
                    Text(
                      'Add to Lists',
                      style: GoogleFonts.inter(fontWeight: FontWeight.w600),
                    ),
                    for (final list in widget.availableLists)
                      CheckboxListTile(
                        title: Text(list.value, style: GoogleFonts.inter()),
                        value: _selectedListIds.contains(list.key),
                        activeColor: AppColors.lightGreen,
                        checkColor: AppColors.darkGreen,
                        onChanged: (checked) {
                          setState(() {
                            if (checked == true) {
                              _selectedListIds.add(list.key);
                            } else {
                              _selectedListIds.remove(list.key);
                            }
                          });
                        },
                      ),
                  ],
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
                    onPressed: _isSaving ? null : _handleSave,
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
                            _isEditing ? 'Save Changes' : 'Add to Collection',
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
}
