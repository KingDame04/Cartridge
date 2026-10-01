import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/constants/app_colors.dart';
import '../services/api_service.dart';
import '../services/auth_state.dart';
import '../widgets/app_header_logo.dart';
import 'game_entry_form_screen.dart';
import 'manual_game_form_screen.dart';

class AddGameScreen extends StatefulWidget {
  final List<MapEntry<String, String>> availableLists;

  const AddGameScreen({super.key, this.availableLists = const []});

  @override
  State<AddGameScreen> createState() => _AddGameScreenState();
}

class _AddGameScreenState extends State<AddGameScreen> {
  final _searchController = TextEditingController();
  bool _isSearching = false;
  bool _hasSearched = false;
  String? _errorMessage;
  List<Map<String, dynamic>> _results = [];

  Timer? _debounce;
  // Guards against an older, slower request overwriting the results of a
  // newer one that's since resolved (e.g. typing quickly past a first query
  // whose response comes back after a later one's)
  int _searchGeneration = 0;

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  // Fires a debounced search as the user types, so every keystroke doesn't
  // hit the network — waits for a short pause before actually searching
  void _onSearchChanged(String value) {
    _debounce?.cancel();

    // Also covers showing/hiding the clear button in real time, since that
    // depends on the controller's text and wouldn't otherwise rebuild until
    // the debounced search below actually completes
    setState(() {});

    if (value.trim().isEmpty) {
      setState(() {
        _results = [];
        _hasSearched = false;
        _errorMessage = null;
      });
      return;
    }

    _debounce = Timer(const Duration(milliseconds: 400), _search);
  }

  // Searches RAWG via the backend's /games/search
  Future<void> _search() async {
    final query = _searchController.text.trim();
    if (query.isEmpty) return;

    final generation = ++_searchGeneration;

    setState(() {
      _isSearching = true;
      _hasSearched = true;
      _errorMessage = null;
    });

    try {
      final token = Provider.of<AuthState>(context, listen: false).token;
      final apiService = ApiService();
      final response = await apiService.get(
        '/games/search?search=${Uri.encodeQueryComponent(query)}',
        token: token,
      );

      if (!mounted || generation != _searchGeneration) return;

      setState(() {
        if (response.statusCode == 200) {
          final data = jsonDecode(response.body);
          _results = List<Map<String, dynamic>>.from(data['results'] ?? []);
        } else {
          _results = [];
        }
      });
    } catch (e) {
      if (mounted && generation == _searchGeneration) {
        setState(() {
          _errorMessage = 'Could not search right now. Please try again.';
          _results = [];
        });
      }
    } finally {
      if (mounted && generation == _searchGeneration) {
        setState(() {
          _isSearching = false;
        });
      }
    }
  }

  // Search results only ever have rawgId right now (backend doesn't check
  // the cache before hitting RAWG) — gameId would only appear if that changes
  Future<void> _selectResult(Map<String, dynamic> game) async {
    final platforms =
        (game['platforms'] as List?)?.map((p) => p.toString()).toList() ?? [];
    final saved = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (context) => GameEntryFormScreen(
          gameId: game['gameId']?.toString(),
          rawgId: game['gameId'] == null ? game['rawgId']?.toString() : null,
          gameName: game['name']?.toString() ?? '',
          gameCoverImage: game['coverImage']?.toString(),
          platforms: platforms,
          availableLists: widget.availableLists,
        ),
      ),
    );
    if (saved == true && mounted) {
      Navigator.pop(context, true);
    }
  }

  Future<void> _createManually() async {
    final saved = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (context) => ManualGameFormScreen(
          initialName: _searchController.text.trim(),
          availableLists: widget.availableLists,
        ),
      ),
    );
    if (saved == true && mounted) {
      Navigator.pop(context, true);
    }
  }

  // A light-green pill button used for Go Back / New Game Entry, matching
  // the app's dark-green-on-light-green treatment used elsewhere
  Widget _actionButton({
    required IconData icon,
    required String label,
    required VoidCallback onPressed,
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
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
                  child: TextField(
                    controller: _searchController,
                    onChanged: _onSearchChanged,
                    onSubmitted: (_) {
                      _debounce?.cancel();
                      _search();
                    },
                    style: GoogleFonts.inter(color: AppColors.darkGreen),
                    cursorColor: AppColors.darkGreen,
                    decoration: InputDecoration(
                      hintText: 'Search for a game',
                      hintStyle: GoogleFonts.inter(
                        color: AppColors.darkGreen.withOpacity(0.6),
                      ),
                      isDense: true,
                      filled: true,
                      fillColor: AppColors.textBoxFill,
                      prefixIcon: IconButton(
                        icon: Icon(Icons.search, color: AppColors.darkGreen),
                        onPressed: () {
                          _debounce?.cancel();
                          _search();
                        },
                      ),
                      suffixIcon: _searchController.text.isEmpty
                          ? null
                          : IconButton(
                              icon: Icon(Icons.clear, color: AppColors.darkGreen),
                              onPressed: () {
                                _searchController.clear();
                                _onSearchChanged('');
                              },
                            ),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide.none,
                      ),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
                  child: Row(
                    children: [
                      _actionButton(
                        icon: Icons.arrow_back,
                        label: 'Go Back',
                        onPressed: () => Navigator.pop(context),
                      ),
                      const SizedBox(width: 8),
                      _actionButton(
                        icon: Icons.add,
                        label: 'New Game Entry',
                        onPressed: _createManually,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (_isSearching)
                    const Center(
                      child: CircularProgressIndicator(
                        color: AppColors.lightGreen,
                      ),
                    ),
                  if (_errorMessage != null)
                    Text(
                      _errorMessage!,
                      style: GoogleFonts.inter(color: Colors.red),
                    ),
                  if (!_isSearching && _hasSearched && _results.isEmpty) ...[
                    Text(
                      'No games found for "${_searchController.text.trim()}".',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.inter(),
                    ),
                    const SizedBox(height: 12),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.lightGreen,
                        foregroundColor: AppColors.darkGreen,
                      ),
                      onPressed: _createManually,
                      child: Text(
                        'Create a New Game Entry',
                        style: GoogleFonts.inter(
                          color: AppColors.darkGreen,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                  if (!_isSearching && _results.isNotEmpty)
                    Expanded(
                      child: ListView.builder(
                        itemCount: _results.length,
                        itemBuilder: (context, index) {
                          final game = _results[index];
                          final coverImage = game['coverImage']?.toString();
                          return ListTile(
                            leading: SizedBox(
                              width: 40,
                              height: 56,
                              child: (coverImage == null || coverImage.isEmpty)
                                  ? Container(color: Colors.grey[300])
                                  : Image.network(
                                      coverImage,
                                      fit: BoxFit.cover,
                                      errorBuilder:
                                          (context, error, stackTrace) =>
                                              Container(
                                                color: Colors.grey[300],
                                              ),
                                    ),
                            ),
                            title: Text(
                              game['name']?.toString() ?? '',
                              style: GoogleFonts.inter(),
                            ),
                            subtitle: Text(
                              (game['platforms'] as List?)?.join(', ') ?? '',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.inter(),
                            ),
                            onTap: () => _selectResult(game),
                          );
                        },
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
