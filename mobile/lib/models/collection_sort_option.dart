enum CollectionSortOption {
  dateAddedNewest,
  dateAddedOldest,
  titleAZ,
  titleZA,
  ratingHighToLow,
  ratingLowToHigh,
}

extension CollectionSortOptionLabel on CollectionSortOption {
  String get label {
    switch (this) {
      case CollectionSortOption.dateAddedNewest:
        return 'Date Added (Newest First)';
      case CollectionSortOption.dateAddedOldest:
        return 'Date Added (Oldest First)';
      case CollectionSortOption.titleAZ:
        return 'Title (A-Z)';
      case CollectionSortOption.titleZA:
        return 'Title (Z-A)';
      case CollectionSortOption.ratingHighToLow:
        return 'Rating (High to Low)';
      case CollectionSortOption.ratingLowToHigh:
        return 'Rating (Low to High)';
    }
  }
}
