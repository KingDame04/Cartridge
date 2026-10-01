import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/constants/app_colors.dart';
import '../services/api_service.dart';
import '../services/auth_state.dart';
import '../utils/api_normalize.dart';
import '../widgets/app_header_logo.dart';
import '../widgets/game_card.dart';
import '../widgets/list_card.dart';
import '../models/collection_filters.dart';
import 'add_game_screen.dart';
import 'create_list_screen.dart';
import 'collection_screen.dart';
import 'game_detail_screen.dart';

class HomeScreen extends StatefulWidget {
  final VoidCallback onSeeAllGames;
  final VoidCallback onSeeAllLists;

  const HomeScreen({
    super.key,
    required this.onSeeAllGames,
    required this.onSeeAllLists,
  });

  @override
  State<HomeScreen> createState() => HomeScreenState();
}

class HomeScreenState extends State<HomeScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  List<Map<String, dynamic>> _collectionEntries = [];
  List<MapEntry<String, String>> _availableLists = [];
  List<dynamic> _recentGames = [];
  List<dynamic> _recentLists = [];

  // Kick off the initial data fetch
  @override
  void initState() {
    super.initState();
    _loadDashboardData();
  }

  // Called by MainNavScreen when this tab is (re)selected, since the
  // IndexedStack keeps this screen alive rather than rebuilding it — without
  // this, changes made on other tabs (e.g. adding a game) would never show
  // up here until the app restarts.
  Future<void> refresh() => _loadDashboardData();

  // Fetch the user's game entries and lists, then derive the 5 most recent of each
  Future<void> _loadDashboardData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final token = Provider.of<AuthState>(context, listen: false).token;
      final apiService = ApiService();

      final gamesResponse = await apiService.get(
        '/user-game-entries/collection',
        token: token,
      );
      final listsResponse = await apiService.get('/lists', token: token);

      if (!mounted) return;

      final gameEntries = gamesResponse.statusCode == 200
          ? List<Map<String, dynamic>>.from(
              jsonDecode(gamesResponse.body),
            ).map(normalizeEntry).toList()
          : <Map<String, dynamic>>[];
      final lists = listsResponse.statusCode == 200
          ? List<Map<String, dynamic>>.from(
              jsonDecode(listsResponse.body),
            ).map(normalizeList).toList()
          : <Map<String, dynamic>>[];

      // Most recently added games / updated lists first
      gameEntries.sort(
        (a, b) => DateTime.parse(
          b['createdAt'],
        ).compareTo(DateTime.parse(a['createdAt'])),
      );
      lists.sort(
        (a, b) => DateTime.parse(
          b['updatedAt'],
        ).compareTo(DateTime.parse(a['updatedAt'])),
      );

      setState(() {
        _collectionEntries = gameEntries;
        _availableLists = lists
            .map(
              (list) =>
                  MapEntry(list['listId'].toString(), list['name'].toString()),
            )
            .toList();
        _recentGames = gameEntries.take(5).toList();
        _recentLists = lists.take(5).toList();
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Could not load your dashboard. Please try again.';
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

  // Opens the add-game flow directly, rather than just switching to the
  // Collection tab and leaving the user to find the add button themselves
  Future<void> _openAddGame() async {
    final added = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (context) => AddGameScreen(availableLists: _availableLists),
      ),
    );
    if (added == true) _loadDashboardData();
  }

  // Opens the create-list flow directly, rather than just switching to the
  // Lists tab and leaving the user to find the add button themselves
  Future<void> _openCreateList() async {
    final created = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (context) =>
            CreateListScreen(collectionEntries: _collectionEntries),
      ),
    );
    if (created == true) _loadDashboardData();
  }

  // Opens a game's detail screen from its card, refreshing the dashboard on
  // return in case it was edited or removed
  Future<void> _openGameDetail(Map<String, dynamic> entry) async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => GameDetailScreen(
          entry: entry,
          availableLists: _availableLists,
        ),
      ),
    );
    if (mounted) _loadDashboardData();
  }

  // Opens a list's contents from its card, same destination as the Lists
  // tab's own cards, refreshing the dashboard on return
  Future<void> _openListContents(Map<String, dynamic> list) async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => CollectionScreen(
          title: list['name']?.toString(),
          initialFilters: CollectionFilters(
            listIds: {list['listId'].toString()},
          ),
        ),
      ),
    );
    if (mounted) _loadDashboardData();
  }

  // The 4 most recently added games in this list, for the card's cover grid
  List<String?> _recentCoverImages(String listId) {
    final entries = _collectionEntries.where((entry) {
      final listIds =
          (entry['listIds'] as List?)?.map((id) => id.toString()).toSet() ?? {};
      return listIds.contains(listId);
    }).toList();
    entries.sort(
      (a, b) => DateTime.parse(
        b['createdAt'],
      ).compareTo(DateTime.parse(a['createdAt'])),
    );
    return entries.take(4).map((e) => e['coverImage']?.toString()).toList();
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
            // Anchors the logo row to the top of the bar (right after the
            // status bar inset), so the bar's extra height becomes breathing
            // room below the logo specifically, instead of being split
            // evenly above and below it.
            child: Align(
              alignment: Alignment.topLeft,
              child: const AppHeaderLogo(),
            ),
          ),
        ),
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.lightGreen),
            )
          : RefreshIndicator(
              onRefresh: _loadDashboardData,
              child: ListView(
                padding: const EdgeInsets.all(16.0),
                children: [
                  if (_errorMessage != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: Text(
                        _errorMessage!,
                        style: GoogleFonts.inter(color: Colors.red),
                      ),
                    ),
                  _buildSection(
                    title: 'Recently Added Games',
                    onSeeAll: widget.onSeeAllGames,
                    items: _recentGames,
                    emptyMessage: 'No games yet.',
                    emptyButtonLabel: 'Add a Game',
                    onEmptyButtonPressed: _openAddGame,
                    cardBuilder: (item) => GameCard(
                      title: item['name']?.toString() ?? '',
                      imageUrl: item['coverImage']?.toString(),
                      rating: (item['rating'] as num?)?.toDouble(),
                      platformPlayed: item['platformPlayed']?.toString(),
                      hoursPlayed: (item['hoursPlayed'] as num?)?.toDouble(),
                      width: 138,
                      height: 212,
                      onTap: () => _openGameDetail(item),
                    ),
                  ),
                  const SizedBox(height: 24),
                  _buildSection(
                    title: 'Recently Updated Lists',
                    onSeeAll: widget.onSeeAllLists,
                    items: _recentLists,
                    emptyMessage: 'No lists yet.',
                    emptyButtonLabel: 'Add a List',
                    onEmptyButtonPressed: _openCreateList,
                    cardBuilder: (item) => SizedBox(
                      width: 138,
                      height: 212,
                      child: ListCard(
                        title: item['name']?.toString() ?? '',
                        coverImages: _recentCoverImages(
                          item['listId'].toString(),
                        ),
                        onTap: () => _openListContents(item),
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  // Builds one carousel section: title + See All link, then either the
  // horizontally-scrolling cards or an empty-state message and add button
  Widget _buildSection({
    required String title,
    required VoidCallback onSeeAll,
    required List<dynamic> items,
    required String emptyMessage,
    required String emptyButtonLabel,
    required VoidCallback onEmptyButtonPressed,
    required Widget Function(Map<String, dynamic> item) cardBuilder,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              title,
              style: GoogleFonts.vt323(
                fontSize: 30,
                color: AppColors.darkGreen,
                fontWeight: FontWeight.bold,
              ),
            ),
            TextButton(
              onPressed: onSeeAll,
              style: TextButton.styleFrom(
                backgroundColor: AppColors.lightGreen,
                foregroundColor: AppColors.darkGreen,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              child: Text(
                'See All',
                style: GoogleFonts.inter(
                  color: AppColors.darkGreen,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (items.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Column(
              children: [
                Text(emptyMessage, style: GoogleFonts.inter()),
                const SizedBox(height: 8),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.darkGreen,
                    foregroundColor: AppColors.textLight,
                  ),
                  onPressed: onEmptyButtonPressed,
                  child: Text(
                    emptyButtonLabel,
                    style: GoogleFonts.inter(color: AppColors.textLight),
                  ),
                ),
              ],
            ),
          )
        else
          SizedBox(
            height: 212,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: items.length,
              separatorBuilder: (context, index) => const SizedBox(width: 12),
              itemBuilder: (context, index) {
                final item = items[index] as Map<String, dynamic>;
                return cardBuilder(item);
              },
            ),
          ),
      ],
    );
  }
}
