enum ListSortOption {
  mostRecentlyUpdated,
  oldestToRecent,
  nameAZ,
  nameZA,
}

extension ListSortOptionLabel on ListSortOption {
  String get label {
    switch (this) {
      case ListSortOption.mostRecentlyUpdated:
        return 'Most Recently Updated';
      case ListSortOption.oldestToRecent:
        return 'Oldest to Recent';
      case ListSortOption.nameAZ:
        return 'Name (A-Z)';
      case ListSortOption.nameZA:
        return 'Name (Z-A)';
    }
  }
}
