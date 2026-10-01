import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/models/collection_filters.dart';

void main() {
  group('CollectionFilters.isEmpty', () {
    test('is true for the default (no-arg) constructor', () {
      expect(const CollectionFilters().isEmpty, isTrue);
    });

    test('is false when listIds is non-empty', () {
      expect(const CollectionFilters(listIds: {'list1'}).isEmpty, isFalse);
    });

    test('is false when playedFilter is set (true or false, not just non-null)', () {
      expect(const CollectionFilters(playedFilter: true).isEmpty, isFalse);
      expect(const CollectionFilters(playedFilter: false).isEmpty, isFalse);
    });

    test('is false when releaseYearRange is set', () {
      expect(
        const CollectionFilters(releaseYearRange: RangeValues(2000, 2020)).isEmpty,
        isFalse,
      );
    });

    test('is false when developers is non-empty', () {
      expect(const CollectionFilters(developers: {'Nintendo'}).isEmpty, isFalse);
    });

    test('is false when genres is non-empty', () {
      expect(const CollectionFilters(genres: {'RPG'}).isEmpty, isFalse);
    });

    test('is false when multiple fields are set simultaneously', () {
      expect(
        const CollectionFilters(
          listIds: {'list1'},
          genres: {'RPG'},
        ).isEmpty,
        isFalse,
      );
    });
  });
}
