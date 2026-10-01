import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/constants/app_colors.dart';
import '../services/api_service.dart';
import '../services/auth_state.dart';
import '../models/list_sort_option.dart';
import '../models/collection_filters.dart';
import '../widgets/app_header_logo.dart';
import '../widgets/list_card.dart';
import '../widgets/sort_bottom_sheet.dart';
import '../utils/api_normalize.dart';
import 'collection_screen.dart';
import 'create_list_screen.dart';
import 'edit_list_screen.dart';

class ListsScreen extends StatefulWidget {
  const ListsScreen({super.key});

  @override
  State<ListsScreen> createState() => ListsScreenState();
}

class ListsScreenState extends State<ListsScreen> {
  bool _isLoading = true;
  String? _errorMessage;

  List<Map<String, dynamic>> _lists = [];
  List<Map<String, dynamic>> _collectionEntries = [];

  ListSortOption _sortOption = ListSortOption.mostRecentlyUpdated;

  @override
  void initState() {
    super.initState();
    _loadLists();
  }

  // Called by MainNavScreen when this tab is (re)selected — see the same
  // note on HomeScreenState.refresh() for why this is necessary.
  Future<void> refresh() => _loadLists();

  // Fetch the user's lists and their collection (the latter is needed for
  // the create/edit list flows' game checklists)
  Future<void> _loadLists() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final token = Provider.of<AuthState>(context, listen: false).token;
      final apiService = ApiService();

      final listsResponse = await apiService.get('/lists', token: token);
      final entriesResponse = await apiService.get(
        '/user-game-entries/collection',
        token: token,
      );

      if (!mounted) return;

      setState(() {
        _lists = listsResponse.statusCode == 200
            ? List<Map<String, dynamic>>.from(
                jsonDecode(listsResponse.body),
              ).map(normalizeList).toList()
            : [];
        _collectionEntries = entriesResponse.statusCode == 200
            ? List<Map<String, dynamic>>.from(
                jsonDecode(entriesResponse.body),
              ).map(normalizeEntry).toList()
            : [];
        _sortLists();
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Could not load your lists. Please try again.';
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

  void _sortLists() {
    _lists.sort((a, b) {
      switch (_sortOption) {
        case ListSortOption.mostRecentlyUpdated:
          return DateTime.parse(
            b['updatedAt'],
          ).compareTo(DateTime.parse(a['updatedAt']));
        case ListSortOption.oldestToRecent:
          return DateTime.parse(
            a['updatedAt'],
          ).compareTo(DateTime.parse(b['updatedAt']));
        case ListSortOption.nameAZ:
          return (a['name'] ?? '').toString().compareTo(
            (b['name'] ?? '').toString(),
          );
        case ListSortOption.nameZA:
          return (b['name'] ?? '').toString().compareTo(
            (a['name'] ?? '').toString(),
          );
      }
    });
  }

  Future<void> _openSortSheet() async {
    final result = await showModalBottomSheet<ListSortOption>(
      context: context,
      builder: (context) => SortBottomSheet<ListSortOption>(
        selected: _sortOption,
        options: ListSortOption.values,
        labelBuilder: (option) => option.label,
      ),
    );
    if (result != null) {
      setState(() {
        _sortOption = result;
        _sortLists();
      });
    }
  }

  Future<void> _openCreateList() async {
    final created = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (context) =>
            CreateListScreen(collectionEntries: _collectionEntries),
      ),
    );
    if (created == true) {
      _loadLists();
    }
  }

  Future<void> _openEditList(Map<String, dynamic> list) async {
    final changed = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (context) =>
            EditListScreen(list: list, collectionEntries: _collectionEntries),
      ),
    );
    if (changed == true) {
      _loadLists();
    }
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

  void _openListContents(Map<String, dynamic> list) {
    Navigator.push(
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
  }

  // A light-green pill button used for Add List / Sort List, matching
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
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
              child: Row(
                children: [
                  _actionButton(
                    icon: Icons.add,
                    label: 'Add List',
                    onPressed: _openCreateList,
                  ),
                  const SizedBox(width: 8),
                  _actionButton(
                    icon: Icons.sort,
                    label: 'Sort Lists',
                    onPressed: _openSortSheet,
                  ),
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Your Lists',
                style: GoogleFonts.vt323(
                  fontSize: 30,
                  color: AppColors.darkGreen,
                  fontWeight: FontWeight.bold,
                ),
              ),
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
                    onRefresh: _loadLists,
                    child: _lists.isEmpty
                        ? ListView(
                            children: [
                              if (_errorMessage != null)
                                Padding(
                                  padding: const EdgeInsets.all(16.0),
                                  child: Text(
                                    _errorMessage!,
                                    style: const TextStyle(color: Colors.red),
                                  ),
                                ),
                              Padding(
                                padding: const EdgeInsets.all(32.0),
                                child: Center(
                                  child: Column(
                                    children: [
                                      const Text('No lists yet.'),
                                      const SizedBox(height: 12),
                                      ElevatedButton(
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: AppColors.darkGreen,
                                          foregroundColor: AppColors.textLight,
                                        ),
                                        onPressed: _openCreateList,
                                        child: Text(
                                          'New List',
                                          style: GoogleFonts.inter(
                                            color: AppColors.textLight,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          )
                        : GridView.builder(
                            padding: const EdgeInsets.fromLTRB(12, 12, 12, 80),
                            gridDelegate:
                                const SliverGridDelegateWithFixedCrossAxisCount(
                                  crossAxisCount: 2,
                                  mainAxisSpacing: 12,
                                  crossAxisSpacing: 12,
                                  childAspectRatio: 0.9,
                                ),
                            itemCount: _lists.length,
                            itemBuilder: (context, index) {
                              final list = _lists[index];
                              return ListCard(
                                title: list['name']?.toString() ?? '',
                                coverImages: _recentCoverImages(
                                  list['listId'].toString(),
                                ),
                                onTap: () => _openListContents(list),
                                onEdit: () => _openEditList(list),
                              );
                            },
                          ),
                  ),
          ),
        ],
      ),
    );
  }
}
