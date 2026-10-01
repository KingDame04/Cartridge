import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/utils/api_normalize.dart';

void main() {
  group('normalizeEntry', () {
    test('flattens a populated gameId map to top-level fields', () {
      final raw = {
        '_id': 'entry1',
        'gameId': {
          '_id': 'game1',
          'name': 'Chrono Trigger',
          'coverImage': 'https://img/ct.png',
          'genres': ['RPG'],
          'releaseDate': '1995-03-11',
          'developers': ['Square'],
        },
        'played': true,
        'rating': 5,
      };

      final result = normalizeEntry(raw);

      expect(result['entryId'], 'entry1');
      expect(result['gameId'], 'game1');
      expect(result['name'], 'Chrono Trigger');
      expect(result['coverImage'], 'https://img/ct.png');
      expect(result['genres'], ['RPG']);
      expect(result['releaseDate'], '1995-03-11');
      expect(result['developers'], ['Square']);
      // Fields not touched by normalization pass through unchanged
      expect(result['played'], true);
      expect(result['rating'], 5);
    });

    test('falls back to the raw gameId string when it is not populated', () {
      final raw = {'_id': 'entry1', 'gameId': 'game1'};

      final result = normalizeEntry(raw);

      expect(result['gameId'], 'game1');
      expect(result['name'], isNull);
      expect(result['coverImage'], isNull);
    });

    test('handles a missing _id and missing gameId gracefully', () {
      final result = normalizeEntry(<String, dynamic>{});

      expect(result['entryId'], isNull);
      expect(result['gameId'], isNull);
      expect(result['name'], isNull);
    });
  });

  group('normalizeList', () {
    test('adds listId from _id', () {
      final result = normalizeList({'_id': 'list1', 'name': 'Favorites'});

      expect(result['listId'], 'list1');
      expect(result['name'], 'Favorites');
    });

    test('listId is null when _id is missing', () {
      final result = normalizeList({'name': 'Favorites'});

      expect(result['listId'], isNull);
    });
  });
}
