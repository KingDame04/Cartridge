// Adapts the real backend's response shapes (a nested game object under
// gameId, Mongo's default _id field) into the flat shape the rest of the
// app already expects (entryId/listId, name/coverImage/etc. at top level).

Map<String, dynamic> normalizeEntry(Map<String, dynamic> raw) {
  final rawGame = raw['gameId'];
  final game = rawGame is Map<String, dynamic> ? rawGame : null;

  return {
    ...raw,
    'entryId': raw['_id']?.toString(),
    'gameId': game != null ? game['_id']?.toString() : raw['gameId']?.toString(),
    'name': game?['name'],
    'coverImage': game?['coverImage'],
    'genres': game?['genres'],
    'releaseDate': game?['releaseDate'],
    'developers': game?['developers'],
  };
}

Map<String, dynamic> normalizeList(Map<String, dynamic> raw) {
  return {
    ...raw,
    'listId': raw['_id']?.toString(),
  };
}
