import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/constants/app_colors.dart';
import '../services/api_service.dart';
import '../services/auth_state.dart';
import '../utils/api_normalize.dart';
import '../widgets/app_header_logo.dart';
import 'game_entry_form_screen.dart';

// Shows everything about one collection entry, and lets the user edit or
// delete it. Reuses the entry data already fetched by the Collection screen
// rather than re-fetching it on open — but after an edit, re-fetches just
// this entry so the Collection screen can patch it in place instead of
// reloading the whole collection.
class GameDetailScreen extends StatefulWidget {
  final Map<String, dynamic> entry;
  final List<MapEntry<String, String>> availableLists;

  const GameDetailScreen({
    super.key,
    required this.entry,
    this.availableLists = const [],
  });

  @override
  State<GameDetailScreen> createState() => _GameDetailScreenState();
}

class _GameDetailScreenState extends State<GameDetailScreen> {
  bool _isDeleting = false;

  // Opens the shared entry form pre-filled with this entry's values
  Future<void> _handleEdit() async {
    final entry = widget.entry;
    final platforms =
        (entry['platforms'] as List?)?.map((p) => p.toString()).toList() ?? [];
    final listIds =
        (entry['listIds'] as List?)?.map((id) => id.toString()).toSet() ?? {};

    final saved = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (context) => GameEntryFormScreen(
          entryId: entry['entryId']?.toString(),
          gameId: entry['gameId']?.toString(),
          gameName: entry['name']?.toString() ?? '',
          gameCoverImage: entry['coverImage']?.toString(),
          platforms: platforms,
          availableLists: widget.availableLists,
          initialPlayed: entry['played'] == true,
          initialRating: (entry['rating'] as num?)?.toDouble(),
          initialHoursPlayed: (entry['hoursPlayed'] as num?)?.toDouble(),
          initialReview: entry['review']?.toString(),
          initialPlatformPlayed: entry['platformPlayed']?.toString(),
          initialListIds: listIds,
        ),
      ),
    );

    if (saved != true || !mounted) return;

    // Fetch just this entry so the Collection screen can patch it in place
    // rather than reloading the whole collection. Falls back to signaling a
    // full reload if the single-entry fetch fails for any reason.
    Map<String, dynamic>? updatedEntry;
    final entryId = entry['entryId']?.toString();
    if (entryId != null) {
      try {
        final token = Provider.of<AuthState>(context, listen: false).token;
        final apiService = ApiService();
        final response = await apiService.get(
          '/user-game-entries/collection/$entryId',
          token: token,
        );
        if (response.statusCode == 200) {
          updatedEntry = normalizeEntry(jsonDecode(response.body));
        }
      } catch (e) {
        // Fall through — Collection screen will do a full reload instead.
      }
    }

    if (!mounted) return;
    Navigator.pop(context, updatedEntry ?? true);
  }

  Future<void> _handleDelete() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Remove from Collection?', style: GoogleFonts.inter()),
        content: Text(
          'This will remove "${widget.entry['name']}" from your collection.',
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
        '/user-game-entries/${widget.entry['entryId']}',
        token: token,
      );

      if (!mounted) return;

      if (response.statusCode == 200 || response.statusCode == 204) {
        Navigator.pop(context, true);
      } else {
        setState(() => _isDeleting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Could not delete. Please try again.',
              style: GoogleFonts.inter(),
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isDeleting = false);
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

  // A light-green pill button used for Go Back / Edit / Delete, matching
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

  // Star row when rated, or a "Not rated yet." label otherwise
  Widget _buildRating(double? rating) {
    if (rating == null || rating == 0) {
      return Text(
        'Not rated yet.',
        style: GoogleFonts.inter(
          color: Colors.green,
          fontWeight: FontWeight.w600,
        ),
      );
    }
    final filled = rating.round().clamp(0, 5);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(
        5,
        (i) => Icon(
          i < filled ? Icons.star : Icons.star_border,
          color: Colors.amber,
        ),
      ),
    );
  }

  // Screen contents
  @override
  Widget build(BuildContext context) {
    final entry = widget.entry;
    final coverImage = entry['coverImage']?.toString();
    final rating = (entry['rating'] as num?)?.toDouble();
    final hoursPlayed = (entry['hoursPlayed'] as num?)?.toDouble();
    final genres =
        (entry['genres'] as List?)?.map((g) => g.toString()).toList() ?? [];
    final developers =
        (entry['developers'] as List?)?.map((d) => d.toString()).toList() ?? [];
    final listIds =
        (entry['listIds'] as List?)?.map((id) => id.toString()).toSet() ?? {};
    final listNames = widget.availableLists
        .where((list) => listIds.contains(list.key))
        .map((list) => list.value)
        .toList();

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
          Expanded(
            child: _isDeleting
                ? const Center(
                    child: CircularProgressIndicator(
                      color: AppColors.lightGreen,
                    ),
                  )
                : ListView(
                    padding: const EdgeInsets.all(16.0),
                    children: [
                      Center(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: SizedBox(
                            width: 140,
                            child: AspectRatio(
                              aspectRatio: 3 / 4,
                              child: (coverImage == null || coverImage.isEmpty)
                                  ? Container(
                                      color: Colors.grey[300],
                                      child: const Icon(
                                        Icons.image_not_supported,
                                        size: 40,
                                      ),
                                    )
                                  : Image.network(
                                      coverImage,
                                      fit: BoxFit.cover,
                                      errorBuilder:
                                          (context, error, stackTrace) =>
                                              Container(
                                                color: Colors.grey[300],
                                                child: const Icon(
                                                  Icons.image_not_supported,
                                                  size: 40,
                                                ),
                                              ),
                                    ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Center(
                        child: Text(
                          entry['name']?.toString() ?? '',
                          style: GoogleFonts.inter(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Center(child: _buildRating(rating)),
                      const SizedBox(height: 16),
                      Center(
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              entry['played'] == true
                                  ? Icons.check_circle
                                  : Icons.radio_button_unchecked,
                              size: 18,
                              color: entry['played'] == true
                                  ? Colors.green
                                  : Colors.grey,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              entry['played'] == true
                                  ? 'Played'
                                  : 'Not Yet Played',
                              style: GoogleFonts.inter(),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),
                      Text(
                        'Game Information',
                        style: GoogleFonts.vt323(
                          fontSize: 30,
                          color: AppColors.darkGreen,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      if (entry['platformPlayed'] != null &&
                          entry['platformPlayed'].toString().isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(
                            'Platform: ${entry['platformPlayed']}',
                            style: GoogleFonts.inter(),
                          ),
                        ),
                      if (hoursPlayed != null && hoursPlayed > 0)
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(
                            'Hours Played: ${hoursPlayed % 1 == 0 ? hoursPlayed.toInt() : hoursPlayed}',
                            style: GoogleFonts.inter(),
                          ),
                        ),
                      if (genres.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 16),
                          child: Text(
                            'Genres: ${genres.join(', ')}',
                            style: GoogleFonts.inter(),
                          ),
                        ),
                      if (developers.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(
                            '${developers.length > 1 ? "Developers" : "Developer"}: ${developers.join(', ')}',
                            style: GoogleFonts.inter(),
                          ),
                        ),
                      if (entry['releaseDate'] != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(
                            'Release Date: ${DateTime.parse(entry['releaseDate']).year}',
                            style: GoogleFonts.inter(),
                          ),
                        ),
                      if (listNames.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(
                            'In Lists: ${listNames.join(', ')}',
                            style: GoogleFonts.inter(),
                          ),
                        ),
                      if (entry['review'] != null &&
                          entry['review'].toString().isNotEmpty) ...[
                        const SizedBox(height: 16),
                        Text(
                          'Review',
                          style: GoogleFonts.inter(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          entry['review'].toString(),
                          style: GoogleFonts.inter(),
                        ),
                      ],
                      const SizedBox(height: 24),
                      Row(
                        children: [
                          _actionButton(
                            icon: Icons.edit,
                            label: 'Edit',
                            onPressed: _handleEdit,
                          ),
                          const SizedBox(width: 8),
                          _actionButton(
                            icon: Icons.delete,
                            label: 'Delete',
                            onPressed: _isDeleting ? null : _handleDelete,
                          ),
                        ],
                      ),
                    ],
                  ),
          ),
        ],
      ),
    );
  }
}
