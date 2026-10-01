import 'package:flutter/material.dart';

class CollectionFilters {
  final Set<String> listIds;
  final bool? playedFilter; // null = all, true = played only, false = not played only
  final RangeValues? releaseYearRange;
  final Set<String> developers;
  final Set<String> genres;

  const CollectionFilters({
    this.listIds = const {},
    this.playedFilter,
    this.releaseYearRange,
    this.developers = const {},
    this.genres = const {},
  });

  bool get isEmpty =>
      listIds.isEmpty &&
      playedFilter == null &&
      releaseYearRange == null &&
      developers.isEmpty &&
      genres.isEmpty;
}
