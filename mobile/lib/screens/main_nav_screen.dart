import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/constants/app_colors.dart';
import 'package:provider/provider.dart';
import '../services/auth_state.dart';
import '../utils/tab_navigation.dart';
import '../widgets/pending_email_banner.dart';
import 'home_screen.dart';
import 'collection_screen.dart';
import 'lists_screen.dart';
import 'settings_screen.dart';

class MainNavScreen extends StatefulWidget {
  const MainNavScreen({super.key});

  @override
  State<MainNavScreen> createState() => _MainNavScreenState();
}

class _MainNavScreenState extends State<MainNavScreen> {
  int _selectedIndex = 0;

  final _homeKey = GlobalKey<HomeScreenState>();
  final _collectionKey = GlobalKey<CollectionScreenState>();
  final _listsKey = GlobalKey<ListsScreenState>();

  // One Navigator per tab, so screens pushed from within a tab (e.g. Add
  // Game, Game Detail, Create List) stay confined to that tab's own stack
  // instead of covering the whole app — which is what keeps this
  // bottomNavigationBar visible no matter how deep you've navigated.
  final _homeNavKey = GlobalKey<NavigatorState>();
  final _collectionNavKey = GlobalKey<NavigatorState>();
  final _listsNavKey = GlobalKey<NavigatorState>();
  final _settingsNavKey = GlobalKey<NavigatorState>();

  GlobalKey<NavigatorState> get _currentNavKey {
    switch (_selectedIndex) {
      case 0:
        return _homeNavKey;
      case 1:
        return _collectionNavKey;
      case 2:
        return _listsNavKey;
      default:
        return _settingsNavKey;
    }
  }

  @override
  void initState() {
    super.initState();
    // Lets the header logo on any screen — even one pushed deep within
    // another tab's own nested Navigator — jump back to the Home tab's
    // root, since it has no direct way to reach up to this widget otherwise.
    goToHomeTab = _goToHomeAndReset;
  }

  @override
  void dispose() {
    goToHomeTab = null;
    super.dispose();
  }

  // Unlike _goToTab(0) (which, like any other tab switch, leaves Home
  // wherever it was last left when arriving from a different tab), tapping
  // the header logo always means "take me to the actual home page" — so
  // this resets Home's own stack to its root regardless of where it was.
  void _goToHomeAndReset() {
    _homeNavKey.currentState?.popUntil((route) => route.isFirst);
    if (_selectedIndex != 0) {
      setState(() {
        _selectedIndex = 0;
      });
    }
    _homeKey.currentState?.refresh();
  }

  // Switch the visible tab. Since the IndexedStack below keeps every tab's
  // screen alive rather than rebuilding it, changes made on one tab (e.g.
  // adding a game from Home) wouldn't otherwise be reflected on the others
  // — so refresh them here on every reselect.
  //
  // Re-tapping the tab you're already on (or, via the header logo, jumping
  // to Home while already there) doesn't switch anything for IndexedStack
  // to notice, so that case instead pops that tab's own stack back to its
  // root screen — the usual "tap the active tab to go back to top" behavior.
  void _goToTab(int index) {
    if (index == _selectedIndex) {
      _currentNavKey.currentState?.popUntil((route) => route.isFirst);
      return;
    }

    setState(() {
      _selectedIndex = index;
    });
    if (index == 0) {
      _homeKey.currentState?.refresh();
    } else if (index == 1) {
      _collectionKey.currentState?.refresh();
    } else if (index == 2) {
      _listsKey.currentState?.refresh();
    }
  }

  // Wraps a tab's root screen in its own Navigator so pushes from within it
  // (e.g. tapping into a game's detail screen) stay inside that tab's own
  // stack, underneath the persistent bottom nav bar.
  Widget _tabNavigator(GlobalKey<NavigatorState> navKey, Widget rootScreen) {
    return Navigator(
      key: navKey,
      onGenerateRoute: (settings) =>
          MaterialPageRoute(builder: (context) => rootScreen),
    );
  }

  // Nav shell: bottom nav bar + the four tab screens, kept alive via IndexedStack
  // so switching tabs doesn't lose each screen's state (e.g. Home's fetched data)
  @override
  Widget build(BuildContext context) {
    final screens = [
      _tabNavigator(
        _homeNavKey,
        HomeScreen(
          key: _homeKey,
          onSeeAllGames: () => _goToTab(1),
          onSeeAllLists: () => _goToTab(2),
        ),
      ),
      _tabNavigator(_collectionNavKey, CollectionScreen(key: _collectionKey)),
      _tabNavigator(_listsNavKey, ListsScreen(key: _listsKey)),
      _tabNavigator(_settingsNavKey, const SettingsScreen()),
    ];

    return PopScope(
      // Only let the system back button close the app once the current
      // tab's own stack has nothing left to pop; otherwise pop within that
      // tab first, so the bottom nav bar never gets swept away by it.
      canPop: !(_currentNavKey.currentState?.canPop() ?? false),
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        _currentNavKey.currentState?.pop();
      },
      child: Scaffold(
        body: Column(
          children: [
            Consumer<AuthState>(
              builder: (context, authState, child) {
                final pendingEmail = authState.pendingEmail;
                return pendingEmail == null
                    ? const SizedBox.shrink()
                    : PendingEmailBanner(pendingEmail: pendingEmail);
              },
            ),
            Expanded(
              child: IndexedStack(index: _selectedIndex, children: screens),
            ),
          ],
        ),
        bottomNavigationBar: NavigationBarTheme(
          data: NavigationBarThemeData(
            backgroundColor: AppColors.darkGreen,
            indicatorColor: Colors.transparent,
            iconTheme: WidgetStateProperty.resolveWith((states) {
              return IconThemeData(
                color: states.contains(WidgetState.selected)
                    ? Colors.white
                    : AppColors.lightGreen,
              );
            }),
            labelTextStyle: WidgetStateProperty.resolveWith((states) {
              return GoogleFonts.inter(
                color: states.contains(WidgetState.selected)
                    ? Colors.white
                    : AppColors.lightGreen,
                fontWeight: states.contains(WidgetState.selected)
                    ? FontWeight.bold
                    : FontWeight.normal,
                fontSize: 12,
              );
            }),
          ),
          child: NavigationBar(
            height: 68,
            selectedIndex: _selectedIndex,
            onDestinationSelected: _goToTab,
            destinations: const [
              NavigationDestination(icon: Icon(Icons.home), label: 'Home'),
              NavigationDestination(
                icon: Icon(Icons.videogame_asset),
                label: 'Collection',
              ),
              NavigationDestination(icon: Icon(Icons.list), label: 'Lists'),
              NavigationDestination(
                icon: Icon(Icons.settings),
                label: 'Settings',
              ),
            ],
          ),
        ),
      ),
    );
  }
}
