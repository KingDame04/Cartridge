import React, {
  useState,
  useEffect,
  useContext,
  useCallback,
  useRef
} from 'react';

import { useNavigate, useLocation } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import CollectionGameCard from '../components/CollectionGameCard';
import AddGameModal from '../components/AddGameModal';
import GameDetailModal from '../components/GameDetailModal';
import EditGameModal from '../components/EditGameModal';
import Button from '../components/Button';

import { api } from '../api';
import { AuthContext } from '../context/AuthContext';

function normalizeEntry(rawEntry) {
  const populatedGame =
    rawEntry?.gameId &&
    typeof rawEntry.gameId === 'object'
      ? rawEntry.gameId
      : null;

  return {
    ...rawEntry,

    entryId:
      rawEntry?._id?.toString() ||
      rawEntry?.entryId?.toString(),

    gameId: populatedGame
      ? populatedGame._id?.toString()
      : rawEntry?.gameId?.toString(),

    rawgId:
      populatedGame?.rawgId ||
      rawEntry?.rawgId ||
      null,

    name:
      populatedGame?.name ||
      rawEntry?.name ||
      'Unknown Game',

    coverImage:
      populatedGame?.coverImage ||
      rawEntry?.coverImage ||
      null,

    genres:
      populatedGame?.genres ||
      rawEntry?.genres ||
      [],

    platforms:
      populatedGame?.platforms ||
      rawEntry?.platforms ||
      [],

    releaseDate:
      populatedGame?.releaseDate ||
      rawEntry?.releaseDate ||
      null,

    developers:
      populatedGame?.developers ||
      rawEntry?.developers ||
      [],

    listIds: Array.isArray(rawEntry?.listIds)
      ? rawEntry.listIds
      : []
  };
}

// Debounces a fast-changing value (e.g. every keystroke in the search box)
// so it only settles — and triggers a re-fetch — a moment after typing stops.
function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeoutId);
  }, [value, delayMs]);

  return debounced;
}

export default function CollectionPage() {
  const { token } = useContext(AuthContext);

  const currentToken =
    token || localStorage.getItem('token');

  const navigate = useNavigate();
  const location = useLocation();

  // Collection data — only ever holds the current page's worth of entries,
  // fetched fresh from the server on every page/filter/sort change, rather
  // than the whole collection loaded once and sliced client-side.
  const [pageEntries, setPageEntries] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [filterOptions, setFilterOptions] = useState({ developers: [], genres: [] });
  const [userLists, setUserLists] = useState([]);

  // Loading and errors
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Search
  const [collectionSearch, setCollectionSearch] = useState('');
  const debouncedSearch = useDebouncedValue(collectionSearch, 400);

  // Filters
  const [filterLists, setFilterLists] = useState([]);
  const [playedFilter, setPlayedFilter] = useState('All');
  const [yearMin, setYearMin] = useState('');
  const [yearMax, setYearMax] = useState('');
  const [filterDevelopers, setFilterDevelopers] = useState([]);
  const [filterGenres, setFilterGenres] = useState([]);

  // Sidebar filter search states (filter the already-loaded option lists —
  // this alone stays client-side, since those lists are small)
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [developerSearchQuery, setDeveloperSearchQuery] = useState('');
  const [genreSearchQuery, setGenreSearchQuery] = useState('');

  // Sorting
  const [collectionSortRule, setCollectionSortRule] = useState('date_desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const savedValue = Number(localStorage.getItem('cartridge_items_per_page'));
    return [10, 20, 50].includes(savedValue) ? savedValue : 10;
  });

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [entryToEdit, setEntryToEdit] = useState(null);

  // Guards against an older, slower request's response overwriting a newer
  // one that's since resolved (e.g. clicking Next quickly, or typing past an
  // in-flight search request).
  const requestGeneration = useRef(0);

  /*
   * Load exactly one page of the collection — matching the current search,
   * filters, and sort — plus the sidebar's list/developer/genre options.
   */
  const fetchCollectionPage = useCallback(async () => {
    if (!currentToken) {
      setError('You must be logged in to view your collection.');
      setIsLoading(false);
      return;
    }

    const generation = ++requestGeneration.current;

    setIsLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', String(itemsPerPage));
      params.set('sort', collectionSortRule);
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (filterLists.length > 0) params.set('listIds', filterLists.join(','));
      if (playedFilter !== 'All') {
        params.set('played', playedFilter === 'Played' ? 'true' : 'false');
      }
      if (yearMin) params.set('yearMin', yearMin);
      if (yearMax) params.set('yearMax', yearMax);
      if (filterDevelopers.length > 0) params.set('developers', filterDevelopers.join(','));
      if (filterGenres.length > 0) params.set('genres', filterGenres.join(','));

      const [collectionResponse, listsResponse] = await Promise.all([
        api.get(`/user-game-entries/collection?${params.toString()}`, currentToken),
        api.get('/lists', currentToken)
      ]);

      if (generation !== requestGeneration.current) return; // superseded

      if (!collectionResponse.ok) {
        const collectionError = await collectionResponse.json().catch(() => ({}));
        throw new Error(collectionError.error || collectionError.message || 'Failed to load collection.');
      }

      if (!listsResponse.ok) {
        const listsError = await listsResponse.json().catch(() => ({}));
        throw new Error(listsError.error || listsError.message || 'Failed to load lists.');
      }

      const collectionData = await collectionResponse.json();
      const listsData = await listsResponse.json();

      if (generation !== requestGeneration.current) return; // superseded

      const lists = Array.isArray(listsData)
        ? listsData
        : Array.isArray(listsData?.lists)
          ? listsData.lists
          : [];

      setPageEntries((collectionData.entries || []).map(normalizeEntry));
      setTotalCount(collectionData.totalCount || 0);
      setTotalPages(collectionData.totalPages || 1);
      setFilterOptions(collectionData.filterOptions || { developers: [], genres: [] });
      setUserLists(lists);
    } catch (fetchError) {
      if (generation !== requestGeneration.current) return;
      console.error('Collection page fetch error:', fetchError);
      setError(fetchError.message || 'Failed to load collection data.');
    } finally {
      if (generation === requestGeneration.current) setIsLoading(false);
    }
  }, [
    currentToken,
    currentPage,
    itemsPerPage,
    collectionSortRule,
    debouncedSearch,
    filterLists,
    playedFilter,
    yearMin,
    yearMax,
    filterDevelopers,
    filterGenres
  ]);

  useEffect(() => {
    fetchCollectionPage();
  }, [fetchCollectionPage]);

  // Jump back to page 1 whenever the search/filter/sort criteria change the
  // result set out from under whatever page you were on.
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterLists, playedFilter, yearMin, yearMax, filterDevelopers, filterGenres, collectionSortRule]);

  // Intercept ?list= from the URL and translate Name to ID if necessary
  useEffect(() => {
    if (userLists.length > 0) {
      const params = new URLSearchParams(location.search);
      const listParam = params.get('list');

      if (listParam) {
        const targetList = userLists.find(
          (l) => l._id?.toString() === listParam || l.name === listParam
        );

        if (targetList) {
          const targetId = targetList._id.toString();
          setFilterLists((prev) =>
            prev.includes(targetId) ? prev : [targetId]
          );
        }
      }
    }
  }, [location.search, userLists]);

  // 🟢 Filtered lists/developers/genres for sidebar search functionality —
  // filtering the already-loaded option lists, so this stays client-side.
  const filteredUserLists = React.useMemo(() => {
    const q = listSearchQuery.trim().toLowerCase();
    if (!q) return userLists;
    return userLists.filter(l => l.name?.toLowerCase().includes(q));
  }, [userLists, listSearchQuery]);

  const filteredDevelopers = React.useMemo(() => {
    const q = developerSearchQuery.trim().toLowerCase();
    if (!q) return filterOptions.developers;
    return filterOptions.developers.filter(d => d.toLowerCase().includes(q));
  }, [filterOptions.developers, developerSearchQuery]);

  const filteredGenres = React.useMemo(() => {
    const q = genreSearchQuery.trim().toLowerCase();
    if (!q) return filterOptions.genres;
    return filterOptions.genres.filter(g => g.toLowerCase().includes(q));
  }, [filterOptions.genres, genreSearchQuery]);

  /*
   * Return normalized list IDs for an entry.
   */
  const getEntryListIds = (entry) => {
    if (!Array.isArray(entry?.listIds)) {
      return [];
    }

    return entry.listIds
      .map((listId) => {
        if (listId && typeof listId === 'object') {
          return listId._id?.toString();
        }
        return listId?.toString();
      })
      .filter(Boolean);
  };

  /*
   * Convert an entry's list IDs into names for CollectionGameCard.
   */
  const getListNames = (entry) => {
    const entryListIds = getEntryListIds(entry);

    return userLists
      .filter((list) => entryListIds.includes(list._id?.toString()))
      .map((list) => list.name);
  };

  const toggleCheckboxFilter = (item, currentState, setter) => {
    setter(
      currentState.includes(item)
        ? currentState.filter((currentItem) => currentItem !== item)
        : [...currentState, item]
    );

    if (setter === setFilterLists) {
      navigate('/collection', { replace: true });
    }
  };

  const clearAllFilters = () => {
    setCollectionSearch('');
    setFilterLists([]);
    setPlayedFilter('All');
    setYearMin('');
    setYearMax('');
    setFilterDevelopers([]);
    setFilterGenres([]);
    setListSearchQuery('');
    setDeveloperSearchQuery('');
    setGenreSearchQuery('');
    setCollectionSortRule('date_desc');

    navigate('/collection', { replace: true });
  };

  const handleItemsPerPageChange = (value) => {
    const newValue = Number(value);

    setItemsPerPage(newValue);
    localStorage.setItem('cartridge_items_per_page', String(newValue));
    setCurrentPage(1);
  };

  const handleGameAdded = async () => {
    setIsAddModalOpen(false);
    setCollectionSearch('');
    setCurrentPage(1);
    await fetchCollectionPage();
  };

  const handleOpenDuplicateEntry = (duplicateEntryId) => {
    const normalizedDuplicateId = duplicateEntryId?.toString();

    // The duplicate entry may not be on the currently-loaded page (we only
    // ever hold one page's worth of entries now) — fall back to opening the
    // edit modal with just the id in that case, same as before.
    const existingEntry = pageEntries.find(
      (entry) =>
        entry.entryId?.toString() === normalizedDuplicateId ||
        entry._id?.toString() === normalizedDuplicateId
    );

    setIsAddModalOpen(false);

    setEntryToEdit(
      existingEntry || {
        _id: normalizedDuplicateId,
        entryId: normalizedDuplicateId
      }
    );
  };

  const currentYear = new Date().getFullYear();

  const yearOptions = Array.from(
    { length: currentYear - 1970 + 1 },
    (_, index) => currentYear - index
  );

  const hasActiveFilters =
    collectionSearch.trim() !== '' ||
    filterLists.length > 0 ||
    playedFilter !== 'All' ||
    yearMin !== '' ||
    yearMax !== '' ||
    filterDevelopers.length > 0 ||
    filterGenres.length > 0 ||
    collectionSortRule !== 'date_desc';

  return (
    <DashboardLayout
      showSearch
      searchValue={collectionSearch}
      searchPlaceholder="Search your collection..."
      onSearchChange={(value) => {
        setCollectionSearch(value);
      }}
    >
      {/* Add Game Modal */}
      <AddGameModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSaveSuccess={handleGameAdded}
        onOpenEditModal={handleOpenDuplicateEntry}
      />

      {/* View Game Details Modal */}
      <GameDetailModal
        isOpen={selectedEntry !== null}
        onClose={() => setSelectedEntry(null)}
        entry={selectedEntry}
        userLists={userLists}
        onEdit={(entry) => {
          setSelectedEntry(null);
          setEntryToEdit(entry);
        }}
      />

      {/* Edit Game Modal */}
      <EditGameModal
        isOpen={entryToEdit !== null}
        onClose={() => setEntryToEdit(null)}
        entry={entryToEdit}
        userLists={userLists}
        onSaveSuccess={async () => {
          setEntryToEdit(null);
          await fetchCollectionPage();
        }}
      />

      {/* Page heading */}
      <section style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div>
            <h1
              className="font-vt323"
              style={{
                margin: 0,
                color: '#143910',
                fontSize: '42px',
                letterSpacing: '1px',
                lineHeight: 1
              }}
            >
              My Collection
            </h1>

            <p style={{ margin: '8px 0 0 0', color: '#6B7280', fontSize: '14px' }}>
              Showing {pageEntries.length} of {totalCount}{' '}
              {totalCount === 1 ? 'title' : 'titles'}.
            </p>
          </div>

          <Button
            variant="primary"
            onClick={() => setIsAddModalOpen(true)}
            style={{ padding: '10px 20px', fontSize: '14px' }}
          >
            + Add Game
          </Button>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          style={{
            marginBottom: '24px', padding: '14px 16px', borderRadius: '8px',
            border: '1px solid #FCA5A5', backgroundColor: '#FEF2F2',
            color: '#B91C1C', fontSize: '14px', fontWeight: '600'
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 260px) minmax(0, 1fr)', gap: '32px', alignItems: 'start' }}>

        {/* Filter sidebar */}
        <aside style={{ paddingRight: '24px', borderRight: '2px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
            <h2 className="font-vt323" style={{ margin: 0, color: '#143910', fontSize: '28px', letterSpacing: '1px' }}>
              Filters
            </h2>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                style={{ padding: 0, background: 'none', border: 'none', color: '#143910', fontSize: '12px', fontWeight: '700', textDecoration: 'underline', cursor: 'pointer' }}
              >
                Clear all
              </button>
            )}
          </div>

          {/* Sort */}
          <div>
            <label htmlFor="collection-sort" style={{ display: 'block', marginBottom: '8px', color: '#143910', fontSize: '14px', fontWeight: '700' }}>
              Sort By
            </label>
            <select
              id="collection-sort"
              value={collectionSortRule}
              onChange={(event) => setCollectionSortRule(event.target.value)}
              style={{
                width: '100%', padding: '9px 10px', borderRadius: '6px', border: '2px solid #143910',
                backgroundColor: '#FFFFFF', color: '#143910', fontFamily: 'Inter', fontSize: '13px',
                fontWeight: '600', outline: 'none'
              }}
            >
              <option value="date_desc">Date Added: Newest</option>
              <option value="date_asc">Date Added: Oldest</option>
              <option value="title_asc">Title: A–Z</option>
              <option value="title_desc">Title: Z–A</option>
              <option value="dev_asc">Developer: A–Z</option>
              <option value="dev_desc">Developer: Z–A</option>
              <option value="rate_desc">Rating: Highest</option>
              <option value="rate_asc">Rating: Lowest</option>
            </select>
          </div>

          {/* List filter */}
          <div>
            <h3 style={{ margin: '0 0 8px 0', color: '#143910', fontSize: '14px', fontWeight: '700' }}>
              Belongs to List
            </h3>
            {/* 🟢 Search input for Lists */}
            <input
              type="text"
              placeholder="Search lists..."
              value={listSearchQuery}
              onChange={(e) => setListSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '7px 8px', borderRadius: '4px', border: '1px solid #D1D5DB',
                fontFamily: 'Inter', fontSize: '12px', outline: 'none', boxSizing: 'border-box', marginBottom: '6px'
              }}
            />
            <div style={{ maxHeight: '140px', overflowY: 'auto', padding: '10px', border: '1px solid #D1D5DB', borderRadius: '6px', backgroundColor: '#FFFFFF' }}>
              {filteredUserLists.length > 0 ? (
                filteredUserLists.map((list) => {
                  const listId = list._id?.toString();
                  return (
                    <label
                      key={listId}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '7px', color: '#374151', fontSize: '13px', cursor: 'pointer' }}
                    >
                      <input
                        type="checkbox"
                        checked={filterLists.includes(listId)}
                        onChange={() => toggleCheckboxFilter(listId, filterLists, setFilterLists)}
                        style={{ width: '15px', height: '15px' }}
                      />
                      {list.name}
                    </label>
                  );
                })
              ) : (
                <span style={{ color: '#9CA3AF', fontSize: '12px' }}>No lists found.</span>
              )}
            </div>
          </div>

          {/* Gameplay status */}
          <div>
            <label htmlFor="played-filter" style={{ display: 'block', marginBottom: '8px', color: '#143910', fontSize: '14px', fontWeight: '700' }}>
              Gameplay Status
            </label>
            <select
              id="played-filter"
              value={playedFilter}
              onChange={(event) => setPlayedFilter(event.target.value)}
              style={{
                width: '100%', padding: '9px 10px', borderRadius: '6px', border: '1px solid #D1D5DB',
                backgroundColor: '#FFFFFF', fontFamily: 'Inter', fontSize: '13px', outline: 'none'
              }}
            >
              <option value="All">All Games</option>
              <option value="Played">Played</option>
              <option value="Unplayed">Not Yet Played</option>
            </select>
          </div>

          {/* Release year */}
          <div>
            <h3 style={{ margin: '0 0 8px 0', color: '#143910', fontSize: '14px', fontWeight: '700' }}>
              Release Year
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '8px', alignItems: 'center' }}>
              <select
                aria-label="Minimum release year"
                value={yearMin}
                onChange={(event) => setYearMin(event.target.value)}
                style={{
                  minWidth: 0, padding: '8px 6px', borderRadius: '5px', border: '1px solid #D1D5DB',
                  backgroundColor: '#FFFFFF', fontFamily: 'Inter', fontSize: '12px'
                }}
              >
                <option value="">Any</option>
                {[...yearOptions].reverse().map((year) => (
                  <option key={year} value={year} disabled={yearMax && year > Number(yearMax)}>
                    {year}
                  </option>
                ))}
              </select>
              <span style={{ color: '#6B7280', fontSize: '12px' }}>to</span>
              <select
                aria-label="Maximum release year"
                value={yearMax}
                onChange={(event) => setYearMax(event.target.value)}
                style={{
                  minWidth: 0, padding: '8px 6px', borderRadius: '5px', border: '1px solid #D1D5DB',
                  backgroundColor: '#FFFFFF', fontFamily: 'Inter', fontSize: '12px'
                }}
              >
                <option value="">Any</option>
                {yearOptions.map((year) => (
                  <option key={year} value={year} disabled={yearMin && year < Number(yearMin)}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Developer filter */}
          <div>
            <h3 style={{ margin: '0 0 8px 0', color: '#143910', fontSize: '14px', fontWeight: '700' }}>
              Developer
            </h3>
            {/* 🟢 Search input for Developers */}
            <input
              type="text"
              placeholder="Search developers..."
              value={developerSearchQuery}
              onChange={(e) => setDeveloperSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '7px 8px', borderRadius: '4px', border: '1px solid #D1D5DB',
                fontFamily: 'Inter', fontSize: '12px', outline: 'none', boxSizing: 'border-box', marginBottom: '6px'
              }}
            />
            <div style={{ maxHeight: '140px', overflowY: 'auto', padding: '10px', border: '1px solid #D1D5DB', borderRadius: '6px', backgroundColor: '#FFFFFF' }}>
              {filteredDevelopers.length > 0 ? (
                filteredDevelopers.map((developer) => (
                  <label key={developer} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '7px', color: '#374151', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={filterDevelopers.includes(developer)}
                      onChange={() => toggleCheckboxFilter(developer, filterDevelopers, setFilterDevelopers)}
                      style={{ width: '15px', height: '15px' }}
                    />
                    {developer}
                  </label>
                ))
              ) : (
                <span style={{ color: '#9CA3AF', fontSize: '12px' }}>No developers found.</span>
              )}
            </div>
          </div>

          {/* Genre filter */}
          <div>
            <h3 style={{ margin: '0 0 8px 0', color: '#143910', fontSize: '14px', fontWeight: '700' }}>
              Genre
            </h3>
            {/* 🟢 Search input for Genres */}
            <input
              type="text"
              placeholder="Search genres..."
              value={genreSearchQuery}
              onChange={(e) => setGenreSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '7px 8px', borderRadius: '4px', border: '1px solid #D1D5DB',
                fontFamily: 'Inter', fontSize: '12px', outline: 'none', boxSizing: 'border-box', marginBottom: '6px'
              }}
            />
            <div style={{ maxHeight: '140px', overflowY: 'auto', padding: '10px', border: '1px solid #D1D5DB', borderRadius: '6px', backgroundColor: '#FFFFFF' }}>
              {filteredGenres.length > 0 ? (
                filteredGenres.map((genre) => (
                  <label key={genre} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '7px', color: '#374151', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={filterGenres.includes(genre)}
                      onChange={() => toggleCheckboxFilter(genre, filterGenres, setFilterGenres)}
                      style={{ width: '15px', height: '15px' }}
                    />
                    {genre}
                  </label>
                ))
              ) : (
                <span style={{ color: '#9CA3AF', fontSize: '12px' }}>No genres found.</span>
              )}
            </div>
          </div>
        </aside>

        {/* Collection content */}
        <section style={{ minWidth: 0 }}>
          {isLoading ? (
            <div style={{ padding: '70px 20px', textAlign: 'center', color: '#143910', fontSize: '15px', fontWeight: '700' }}>
              Loading your collection...
            </div>
          ) : totalCount === 0 && !hasActiveFilters ? (
            <div style={{ padding: '70px 24px', textAlign: 'center', border: '2px dashed #98B910', borderRadius: '16px', backgroundColor: '#F9FAFB' }}>
              <div style={{ marginBottom: '14px', fontSize: '48px' }}>🕹️</div>
              <h2 className="font-vt323" style={{ margin: '0 0 10px 0', color: '#143910', fontSize: '30px' }}>Your Collection is Empty</h2>
              <p style={{ maxWidth: '440px', margin: '0 auto 22px auto', color: '#6B7280', fontSize: '14px', lineHeight: 1.5 }}>
                Add your first game to begin tracking what you have played, your hours, ratings, reviews, and lists.
              </p>
              <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
                + Add Your First Game
              </Button>
            </div>
          ) : pageEntries.length === 0 ? (
            <div style={{ padding: '70px 24px', textAlign: 'center', border: '2px dashed #D1D5DB', borderRadius: '16px', backgroundColor: '#F9FAFB' }}>
              <div style={{ marginBottom: '14px', fontSize: '42px' }}>🔍</div>
              <h2 className="font-vt323" style={{ margin: '0 0 10px 0', color: '#143910', fontSize: '30px' }}>No Matching Games</h2>
              <p style={{ margin: '0 0 20px 0', color: '#6B7280', fontSize: '14px' }}>
                Try changing your search or clearing some filters.
              </p>
              <Button variant="tertiary" onClick={clearAllFilters} style={{ border: '1px solid #98B910', color: '#143910' }}>
                Clear Filters
              </Button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '24px' }}>
              {pageEntries.map((entry) => (
                <CollectionGameCard
                  key={entry.entryId || entry._id}
                  entry={entry}
                  listNames={getListNames(entry)}
                  onClick={() => setSelectedEntry(entry)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {!isLoading && pageEntries.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap', marginTop: '32px', paddingTop: '24px', borderTop: '2px solid #F3F4F6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label htmlFor="items-per-page" style={{ color: '#6B7280', fontSize: '13px' }}>
                  Show:
                </label>
                <select
                  id="items-per-page"
                  value={itemsPerPage}
                  onChange={(event) => handleItemsPerPageChange(event.target.value)}
                  style={{ padding: '7px 8px', borderRadius: '5px', border: '1px solid #D1D5DB', backgroundColor: '#FFFFFF', fontFamily: 'Inter', fontSize: '13px' }}
                >
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <Button variant="primary" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} style={{ padding: '8px 14px' }}>
                  Previous
                </Button>
                <span style={{ color: '#374151', fontSize: '13px', fontWeight: '700' }}>
                  Page {currentPage} of {totalPages}
                </span>
                <Button variant="primary" disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} style={{ padding: '8px 14px' }}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
