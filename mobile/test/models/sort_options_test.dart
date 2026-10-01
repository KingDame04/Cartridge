import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/models/collection_sort_option.dart';
import 'package:mobile/models/list_sort_option.dart';

void main() {
  group('CollectionSortOption.label', () {
    const expectedLabels = {
      CollectionSortOption.dateAddedNewest: 'Date Added (Newest First)',
      CollectionSortOption.dateAddedOldest: 'Date Added (Oldest First)',
      CollectionSortOption.titleAZ: 'Title (A-Z)',
      CollectionSortOption.titleZA: 'Title (Z-A)',
      CollectionSortOption.ratingHighToLow: 'Rating (High to Low)',
      CollectionSortOption.ratingLowToHigh: 'Rating (Low to High)',
    };

    for (final option in CollectionSortOption.values) {
      test('${option.name} has the expected label', () {
        expect(option.label, expectedLabels[option]);
      });
    }

    test('every enum value has a distinct label', () {
      final labels = CollectionSortOption.values.map((o) => o.label).toSet();
      expect(labels.length, CollectionSortOption.values.length);
    });
  });

  group('ListSortOption.label', () {
    const expectedLabels = {
      ListSortOption.mostRecentlyUpdated: 'Most Recently Updated',
      ListSortOption.oldestToRecent: 'Oldest to Recent',
      ListSortOption.nameAZ: 'Name (A-Z)',
      ListSortOption.nameZA: 'Name (Z-A)',
    };

    for (final option in ListSortOption.values) {
      test('${option.name} has the expected label', () {
        expect(option.label, expectedLabels[option]);
      });
    }

    test('every enum value has a distinct label', () {
      final labels = ListSortOption.values.map((o) => o.label).toSet();
      expect(labels.length, ListSortOption.values.length);
    });
  });
}
