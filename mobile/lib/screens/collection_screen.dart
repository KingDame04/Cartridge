import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/constants/app_colors.dart';
import '../services/api_service.dart';
import '../services/auth_state.dart';
import '../models/collection_sort_option.dart';
import '../models/collection_filters.dart';
import '../widgets/app_header_logo.dart';
import '../widgets/game_card.dart';
import '../widgets/sort_bottom_sheet.dart';
import '../widgets/filter_bottom_sheet.dart';
import '../utils/api_normalize.dart';
import 'game_detail_screen.dart';
import 'add_game_screen.dart';

const int _pageSize = 10;

class CollectionScreen extends StatefulWidget {
  // Lets the Lists tab reuse this screen pre-filtered to one list
  final CollectionFilters? initialFilters;
  final String? title;

  const CollectionScreen({super.key, this.initialFilters, this.title});

  @override
  State<CollectionScreen> createState() => CollectionScreenState();
}

class CollectionScreenState extends State<CollectionScreen> {
  bool _isLoading = true;
  String? _errorMessage;

  List<Map<String, dynamic>> _allEntries = [];
  List<Map<String, dynamic>> _filteredSortedEntries = [];
  int _visibleCount = _pageSize;

  List<MapEntry<String, String>> _availableLists = [];

  CollectionSortOption _sortOption = CollectionSortOption.dateAddedNewest;
  CollectionFilters _filters = const CollectionFilters();
  String _searchQuery = '';

  final _scrollController = ScrollController();
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    if (widget.initialFilters != null) {
      _filters = widget.initialFilters!;
    }
    _scrollController.addListener(_onScroll);
    _loadCollection();
  }

  // Called by MainNavScreen when this tab is (re)selected — see the same
  // note on HomeScreenState.refresh() for why this is necessary.
  Future<void> refresh() => _loadCollection();

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged(String value) {
    setState(() {
      _searchQuery = value;
      _visibleCount = _pageSize;
      _applySortAndFilter();
    });
  }

  // Reveal 10 more cards once the user nears the bottom of the grid
  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      if (_visibleCount < _filteredSortedEntries.length) {
        setState(() {
          _visibleCount = (_visibleCount + _pageSize).clamp(
            0,
            _filteredSortedEntries.length,
          );
        });
      }
    }
  }

  // Fetch the user's full collection and their lists (for the list filter)
  Future<void> _loadCollection() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final token = Provider.of<AuthState>(context, listen: false).token;
      final apiService = ApiService();

      final entriesResponse = await apiService.get(
        '/user-game-entries/collection',
        token: token,
      );
      final listsResponse = await apiService.get('/lists', token: token);

      if (!mounted) return;

      final entries = entriesResponse.statusCode == 200
          ? List<Map<String, dynamic>>.from(
              jsonDecode(entriesResponse.body),
            ).map(normalizeEntry).toList()
          : <Map<String, dynamic>>[];
      final lists = listsResponse.statusCode == 200
          ? List<Map<String, dynamic>>.from(
              jsonDecode(listsResponse.body),
            ).map(normalizeList).toList()
          : <Map<String, dynamic>>[];

      setState(() {
        _allEntries = entries;
        _availableLists = lists
            .map(
              (list) =>
                  MapEntry(list['listId'].toString(), list['name'].toString()),
            )
            .toList();
        _visibleCount = _pageSize;
        _applySortAndFilter();
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Could not load your collection. Please try again.';
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  // Whether an entry's name matches the current search text (or there's no
  // search text at all, in which case everything matches).
  bool _matchesSearch(Map<String, dynamic> entry) {
    final query = _searchQuery.trim().toLowerCase();
    if (query.isEmpty) return true;
    final name = (entry['name'] ?? '').toString().toLowerCase();
    return name.contains(query);
  }

  // Recomputes the visible list from _allEntries based on current filters + sort
  void _applySortAndFilter() {
    final result = _allEntries.where((entry) {
      if (!_matchesSearch(entry)) return false;
      if (_filters.listIds.isNotEmpty) {
        final entryListIds =
            (entry['listIds'] as List?)?.map((id) => id.toString()).toSet() ??
            {};
        if (entryListIds.intersection(_filters.listIds).isEmpty) return false;
      }
      if (_filters.playedFilter != null) {
        final played = entry['played'] == true;
        if (played != _filters.playedFilter) return false;
      }
      if (_filters.releaseYearRange != null) {
        final releaseDate = entry['releaseDate'];
        if (releaseDate == null) return false;
        final year = DateTime.parse(releaseDate).year;
        if (year < _filters.releaseYearRange!.start.round() ||
            year > _filters.releaseYearRange!.end.round()) {
          return false;
        }
      }
      if (_filters.developers.isNotEmpty) {
        final entryDevelopers =
            (entry['developers'] as List?)?.map((d) => d.toString()).toSet() ??
            {};
        if (entryDevelopers.intersection(_filters.developers).isEmpty) {
          return false;
        }
      }
      if (_filters.genres.isNotEmpty) {
        final entryGenres =
            (entry['genres'] as List?)?.map((g) => g.toString()).toSet() ?? {};
        if (entryGenres.intersection(_filters.genres).isEmpty) return false;
      }
      return true;
    }).toList();

    result.sort((a, b) {
      switch (_sortOption) {
        case CollectionSortOption.dateAddedNewest:
          return DateTime.parse(
            b['createdAt'],
          ).compareTo(DateTime.parse(a['createdAt']));
        case CollectionSortOption.dateAddedOldest:
          return DateTime.parse(
            a['createdAt'],
          ).compareTo(DateTime.parse(b['createdAt']));
        case CollectionSortOption.titleAZ:
          return (a['name'] ?? '').toString().compareTo(
            (b['name'] ?? '').toString(),
          );
        case CollectionSortOption.titleZA:
          return (b['name'] ?? '').toString().compareTo(
            (a['name'] ?? '').toString(),
          );
        case CollectionSortOption.ratingHighToLow:
          return ((b['rating'] ?? 0) as num).compareTo(
            (a['rating'] ?? 0) as num,
          );
        case CollectionSortOption.ratingLowToHigh:
          return ((a['rating'] ?? 0) as num).compareTo(
            (b['rating'] ?? 0) as num,
          );
      }
    });

    _filteredSortedEntries = result;
  }

  Future<void> _openSortSheet() async {
    final result = await showModalBottomSheet<CollectionSortOption>(
      context: context,
      builder: (context) => SortBottomSheet<CollectionSortOption>(
        selected: _sortOption,
        options: CollectionSortOption.values,
        labelBuilder: (option) => option.label,
      ),
    );
    if (result != null) {
      setState(() {
        _sortOption = result;
        _visibleCount = _pageSize;
        _applySortAndFilter();
      });
    }
  }

  Future<void> _openAddGame() async {
    final added = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (context) => AddGameScreen(availableLists: _availableLists),
      ),
    );
    if (added == true) {
      _loadCollection();
    }
  }

  // Filters apply live as they're picked, rather than needing a separate
  // "Apply" step — every change comes back through onChanged immediately,
  // updating the grid behind the sheet while it's still open.
  void _openFilterSheet() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) => FilterBottomSheet(
        current: _filters,
        entries: _allEntries.where(_matchesSearch).toList(),
        availableLists: _availableLists,
        onChanged: (updatedFilters) {
          setState(() {
            _filters = updatedFilters;
            _visibleCount = _pageSize;
            _applySortAndFilter();
          });
        },
      ),
    );
  }

  // A light-green pill button used for Add Game / Sort / Filter, matching
  // the app's dark-green-on-light-green treatment used elsewhere
  Widget _actionButton({
    required IconData icon,
    required String label,
    required VoidCallback onPressed,
    int flex = 1,
  }) {
    return Expanded(
      flex: flex,
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
    final visible = _filteredSortedEntries.take(_visibleCount).toList();
    final reachedEnd =
        _visibleCount >= _filteredSortedEntries.length &&
        _filteredSortedEntries.isNotEmpty;

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
          // Only shown when this screen is pushed as a specific list's
          // filtered view (e.g. tapping a list card) rather than being the
          // main Collection tab — which has nothing to go back to.
          if (widget.title != null)
            Container(
              color: AppColors.darkGreen,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
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
          Container(
            color: AppColors.darkGreen,
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
                  child: TextField(
                    controller: _searchController,
                    onChanged: _onSearchChanged,
                    style: GoogleFonts.inter(color: AppColors.darkGreen),
                    decoration: InputDecoration(
                      hintText: 'Search your collection',
                      hintStyle: GoogleFonts.inter(
                        color: AppColors.darkGreen.withOpacity(0.6),
                      ),
                      isDense: true,
                      filled: true,
                      fillColor: AppColors.textBoxFill,
                      prefixIcon: Icon(
                        Icons.search,
                        color: AppColors.darkGreen,
                      ),
                      suffixIcon: _searchQuery.isEmpty
                          ? null
                          : IconButton(
                              icon: Icon(
                                Icons.clear,
                                color: AppColors.darkGreen,
                              ),
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
                        icon: Icons.add,
                        label: 'Add Game',
                        onPressed: _openAddGame,
                        flex: 2,
                      ),
                      const SizedBox(width: 8),
                      _actionButton(
                        icon: Icons.sort,
                        label: 'Sort',
                        onPressed: _openSortSheet,
                      ),
                      const SizedBox(width: 8),
                      _actionButton(
                        icon: Icons.filter_list,
                        label: 'Filter',
                        onPressed: _openFilterSheet,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: _isLoading
                ? const Center(
                    child: CircularProgressIndicator(
                      color: AppColors.lightGreen,
                    ),
                  )
                : RefreshIndicator(
                    onRefresh: _loadCollection,
                    child: _allEntries.isEmpty
                        ? ListView(
                            children: [
                              if (_errorMessage != null)
                                Padding(
                                  padding: const EdgeInsets.all(16.0),
                                  child: Text(
                                    _errorMessage!,
                                    style: GoogleFonts.inter(
                                      color: Colors.red,
                                    ),
                                  ),
                                ),
                              Padding(
                                padding: const EdgeInsets.all(32.0),
                                child: Center(
                                  child: Column(
                                    children: [
                                      Text(
                                        'No games in your collection yet.',
                                        style: GoogleFonts.inter(),
                                      ),
                                      const SizedBox(height: 12),
                                      ElevatedButton(
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: AppColors.lightGreen,
                                          foregroundColor: AppColors.darkGreen,
                                        ),
                                        onPressed: _openAddGame,
                                        child: Text(
                                          'Add a Game',
                                          style: GoogleFonts.inter(),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          )
                        : CustomScrollView(
                            controller: _scrollController,
                            slivers: [
                              SliverPadding(
                                padding: const EdgeInsets.fromLTRB(
                                  12,
                                  12,
                                  12,
                                  0,
                                ),
                                sliver: SliverGrid(
                                  gridDelegate:
                                      const SliverGridDelegateWithFixedCrossAxisCount(
                                        crossAxisCount: 2,
                                        mainAxisSpacing: 12,
                                        crossAxisSpacing: 12,
                                        childAspectRatio: 0.65,
                                      ),
                                  delegate: SliverChildBuilderDelegate((
                                    context,
                                    index,
                                  ) {
                                    final entry = visible[index];
                                    return GameCard(
                                      title: entry['name']?.toString() ?? '',
                                      imageUrl: entry['coverImage']?.toString(),
                                      rating: (entry['rating'] as num?)
                                          ?.toDouble(),
                                      platformPlayed: entry['platformPlayed']
                                          ?.toString(),
                                      hoursPlayed:
                                          (entry['hoursPlayed'] as num?)
                                              ?.toDouble(),
                                      onTap: () async {
                                        final result =
                                            await Navigator.push<Object?>(
                                              context,
                                              MaterialPageRoute(
                                                builder: (context) =>
                                                    GameDetailScreen(
                                                      entry: entry,
                                                      availableLists:
                                                          _availableLists,
                                                    ),
                                              ),
                                            );
                                        if (result is Map<String, dynamic>) {
                                          // Edited: patch just this entry instead of
                                          // reloading the whole collection.
                                          setState(() {
                                            final index = _allEntries
                                                .indexWhere(
                                                  (e) =>
                                                      e['entryId']
                                                          ?.toString() ==
                                                      result['entryId']
                                                          ?.toString(),
                                                );
                                            if (index != -1) {
                                              _allEntries[index] = result;
                                            }
                                            _applySortAndFilter();
                                          });
                                        } else if (result == true) {
                                          // Deleted, or the single-entry refresh
                                          // failed — fall back to a full reload.
                                          _loadCollection();
                                        }
                                      },
                                    );
                                  }, childCount: visible.length),
                                ),
                              ),
                              if (reachedEnd)
                                SliverToBoxAdapter(
                                  child: Padding(
                                    padding: const EdgeInsets.all(24.0),
                                    child: Center(
                                      child: Text(
                                        "You've reached the end of your collection.",
                                        style: GoogleFonts.inter(
                                          color: Colors.grey,
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              // Bottom clearance now that FABs are gone
                              const SliverToBoxAdapter(
                                child: SizedBox(height: 24),
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
