import 'dart:convert';
import 'package:http/http.dart' as http;

// A tiny in-memory fake of the real backend — just enough surface area to
// drive the flows in these integration tests (auth/games/entries/lists
// CRUD). Each test constructs its own instance via ApiService.testClient so
// flows never leak state into one another.
class FakeBackend {
  int _nextGameId = 1;
  int _nextEntryId = 1;
  int _nextListId = 1;

  // gameId -> game fields (name/coverImage/genres/releaseDate/developers)
  final Map<String, Map<String, dynamic>> games = {};
  // Raw entries, in the same nested-gameId shape the real API returns —
  // normalizeEntry() only picks up name/coverImage/etc. when 'gameId' is a
  // nested map, not a bare id string.
  final List<Map<String, dynamic>> entries = [];
  final List<Map<String, dynamic>> lists = [];

  static final _singleEntryPath = RegExp(
    r'/user-game-entries/collection/([\w-]+)$',
  );
  static final _deleteEntryPath = RegExp(r'/user-game-entries/([\w-]+)$');
  static final _listPath = RegExp(r'/lists/([\w-]+)$');
  static final _membershipPath = RegExp(
    r'/user-game-entries/lists/([\w-]+)/games/([\w-]+)$',
  );

  // Seeds one game + one collection entry, returning the entry's id — lets a
  // test start from "the user already has a game" without going through the
  // add-game UI flow first.
  String seedEntry({
    required String name,
    List<String> genres = const [],
    List<String> developers = const [],
    List<String> listIds = const [],
  }) {
    final gameId = 'game${_nextGameId++}';
    games[gameId] = {
      'name': name,
      'coverImage': null,
      'genres': genres,
      'releaseDate': null,
      'developers': developers,
    };
    final entryId = 'entry${_nextEntryId++}';
    entries.add({
      '_id': entryId,
      'gameId': {'_id': gameId, ...games[gameId]!},
      'rating': null,
      'hoursPlayed': 0,
      'platformPlayed': null,
      'played': false,
      'review': '',
      'listIds': List<String>.from(listIds),
      'createdAt': DateTime.now().toIso8601String(),
    });
    return entryId;
  }

  // Seeds a list directly, returning its id.
  String seedList({required String name}) {
    final listId = 'list${_nextListId++}';
    lists.add({
      '_id': listId,
      'name': name,
      'updatedAt': DateTime.now().toIso8601String(),
    });
    return listId;
  }

  Map<String, dynamic> _body(http.Request request) => request.body.isEmpty
      ? <String, dynamic>{}
      : jsonDecode(request.body) as Map<String, dynamic>;

  Future<http.Response> handle(http.Request request) async {
    final path = request.url.path;
    final method = request.method;

    if (path.endsWith('/auth/login') && method == 'POST') {
      return http.Response(
        jsonEncode({
          'token': 'Bearer test-token',
          'user': {'id': 'user1', 'email': 'player@example.com'},
        }),
        200,
      );
    }

    if (path.endsWith('/auth/me') && method == 'GET') {
      return http.Response(
        jsonEncode({
          'username': 'player1',
          'email': 'player@example.com',
          'profilePicture': null,
          'bio': '',
        }),
        200,
      );
    }

    if (path.endsWith('/user-game-entries/collection') && method == 'GET') {
      return http.Response(jsonEncode(entries), 200);
    }

    if (method == 'GET' && _singleEntryPath.hasMatch(path)) {
      final id = _singleEntryPath.firstMatch(path)!.group(1);
      final entry = entries.firstWhere(
        (e) => e['_id'] == id,
        orElse: () => <String, dynamic>{},
      );
      if (entry.isEmpty) return http.Response('Not found', 404);
      return http.Response(jsonEncode(entry), 200);
    }

    if (path.endsWith('/lists') && method == 'GET') {
      return http.Response(jsonEncode(lists), 200);
    }

    if (path.endsWith('/games/manual') && method == 'POST') {
      final b = _body(request);
      final gameId = 'game${_nextGameId++}';
      games[gameId] = {
        'name': b['name'],
        'coverImage': b['coverImage'],
        'genres': b['genres'] ?? [],
        'releaseDate': b['releaseDate'],
        'developers': b['developers'] ?? [],
      };
      return http.Response(
        jsonEncode({
          'game': {'_id': gameId, ...games[gameId]!},
        }),
        201,
      );
    }

    if (path.endsWith('/user-game-entries') && method == 'POST') {
      final b = _body(request);
      final gameId = b['gameId'] as String;
      final entryId = 'entry${_nextEntryId++}';
      entries.add({
        '_id': entryId,
        'gameId': {'_id': gameId, ...(games[gameId] ?? {})},
        'rating': b['rating'],
        'hoursPlayed': b['hoursPlayed'],
        'platformPlayed': b['platformPlayed'],
        'played': b['played'],
        'review': b['review'],
        'listIds': List<String>.from(b['listIds'] ?? []),
        'createdAt': DateTime.now().toIso8601String(),
      });
      return http.Response(jsonEncode({'entryId': entryId}), 201);
    }

    if (method == 'PATCH' && _singleEntryPath.hasMatch(path)) {
      final id = _singleEntryPath.firstMatch(path)!.group(1);
      final b = _body(request);
      final entry = entries.firstWhere(
        (e) => e['_id'] == id,
        orElse: () => <String, dynamic>{},
      );
      if (entry.isEmpty) return http.Response('Not found', 404);
      entry['played'] = b['played'];
      entry['hoursPlayed'] = b['hoursPlayed'];
      entry['rating'] = b['rating'];
      entry['review'] = b['review'];
      entry['platformPlayed'] = b['platformPlayed'];
      return http.Response('{}', 200);
    }

    if (method == 'DELETE' &&
        _deleteEntryPath.hasMatch(path) &&
        !path.contains('/collection') &&
        !_membershipPath.hasMatch(path)) {
      final id = _deleteEntryPath.firstMatch(path)!.group(1);
      entries.removeWhere((e) => e['_id'] == id);
      return http.Response('', 204);
    }

    if (path.endsWith('/lists') && method == 'POST') {
      final b = _body(request);
      final listId = 'list${_nextListId++}';
      final entryIds = List<String>.from(b['entryIds'] ?? []);
      lists.add({
        '_id': listId,
        'name': b['name'],
        'updatedAt': DateTime.now().toIso8601String(),
      });
      for (final entryId in entryIds) {
        final entry = entries.firstWhere(
          (e) => e['_id'] == entryId,
          orElse: () => <String, dynamic>{},
        );
        if (entry.isNotEmpty) {
          (entry['listIds'] as List).add(listId);
        }
      }
      return http.Response(jsonEncode({'listId': listId}), 201);
    }

    if (method == 'PATCH' && _listPath.hasMatch(path)) {
      final id = _listPath.firstMatch(path)!.group(1);
      final b = _body(request);
      final list = lists.firstWhere(
        (l) => l['_id'] == id,
        orElse: () => <String, dynamic>{},
      );
      if (list.isEmpty) return http.Response('Not found', 404);
      if (b['name'] != null) list['name'] = b['name'];
      return http.Response('{}', 200);
    }

    if (method == 'DELETE' && _listPath.hasMatch(path)) {
      final id = _listPath.firstMatch(path)!.group(1);
      lists.removeWhere((l) => l['_id'] == id);
      return http.Response('', 204);
    }

    if (_membershipPath.hasMatch(path)) {
      final m = _membershipPath.firstMatch(path)!;
      final listId = m.group(1);
      final gameId = m.group(2);
      final entry = entries.firstWhere(
        (e) => (e['gameId'] as Map)['_id'] == gameId,
        orElse: () => <String, dynamic>{},
      );
      if (entry.isNotEmpty) {
        final listIds = entry['listIds'] as List;
        if (method == 'POST' && !listIds.contains(listId)) listIds.add(listId);
        if (method == 'DELETE') listIds.remove(listId);
      }
      return http.Response('{}', 200);
    }

    return http.Response('Not found: $method $path', 404);
  }
}
