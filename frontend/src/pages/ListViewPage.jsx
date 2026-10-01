import React, {
  useState,
  useEffect,
  useMemo,
  useContext,
  useCallback
} from 'react';
import { useNavigate } from 'react-router-dom';

import DashboardLayout from '../components/DashboardLayout';
import ListCard from '../components/ListCard';
import Button from '../components/Button';
import CreateListModal from '../components/CreateListModal';
import EditListModal from '../components/EditListModal';
import AddGameModal from '../components/AddGameModal';

import { api } from '../api';
import { AuthContext } from '../context/AuthContext';

// Helpers to normalize and extract IDs for the ListCard collage
function normalizeEntry(raw) {
  const rawGame = raw.gameId;
  const game = rawGame && typeof rawGame === 'object' ? rawGame : null;

  return {
    ...raw,
    entryId: raw._id?.toString(),
    gameId: game ? game._id?.toString() : raw.gameId?.toString(),
    name: game?.name || raw.name || 'Unknown Game',
    coverImage: game?.coverImage || raw.coverImage || null,
  };
}

function getEntryListIds(entry) {
  if (!Array.isArray(entry?.listIds)) return [];
  return entry.listIds
    .map((listId) => (listId && typeof listId === 'object' ? listId._id?.toString() : listId?.toString()))
    .filter(Boolean);
}

export default function ListViewPage() {
  const { token } = useContext(AuthContext);
  const currentToken = token || localStorage.getItem('token');
  const navigate = useNavigate();

  // Data states
  const [userLists, setUserLists] = useState([]);
  const [userCollection, setUserCollection] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Search & Sort states
  const [searchQuery, setSearchQuery] = useState('');
  const [sortRule, setSortRule] = useState('date_desc');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const savedValue = localStorage.getItem('cartridge_lists_per_page');
    if (savedValue === 'All') return 'All';
    const parsedValue = Number(savedValue);
    return parsedValue > 0 ? parsedValue : 10;
  });

  // Modal visibility and bridge states
  const [isAddGameModalOpen, setIsAddGameModalOpen] = useState(false);
  const [isCreateListOpen, setIsCreateListOpen] = useState(false);
  const [listToEdit, setListToEdit] = useState(null);

  const [tempListName, setTempListName] = useState('');
  const [tempSelectedEntryIds, setTempSelectedEntryIds] = useState([]);
  const [returnToListModal, setReturnToListModal] = useState(false);
  const [editListDraft, setEditListDraft] = useState(null);

  const fetchPageData = useCallback(async () => {
    if (!currentToken) {
      setError('You must be logged in to view your lists.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const [listsRes, collectionRes] = await Promise.all([
        api.get('/lists', currentToken),
        api.get('/user-game-entries/collection', currentToken)
      ]);

      if (!listsRes.ok) throw new Error('Failed to load lists.');
      if (!collectionRes.ok) throw new Error('Failed to load collection for covers.');

      const listsData = await listsRes.json();
      const collectionData = await collectionRes.json();

      setUserLists(Array.isArray(listsData) ? listsData : []);
      setUserCollection((Array.isArray(collectionData) ? collectionData : []).map(normalizeEntry));
    } catch (err) {
      console.error('List page fetch error:', err);
      setError(err.message || 'Failed to load data.');
    } finally {
      setIsLoading(false);
    }
  }, [currentToken]);

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);

  // Process Search and Sort
  const processedLists = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return [...userLists]
      .filter((list) => {
        if (!normalizedSearch) return true;
        const name = list.name?.toLowerCase() || '';
        return name.includes(normalizedSearch);
      })
      .sort((listA, listB) => {
        const titleA = listA.name || '';
        const titleB = listB.name || '';
        const dateA = new Date(listA.updatedAt || listA.createdAt || 0).getTime();
        const dateB = new Date(listB.updatedAt || listB.createdAt || 0).getTime();

        switch (sortRule) {
          case 'date_asc': return dateA - dateB;
          case 'title_asc': return titleA.localeCompare(titleB);
          case 'title_desc': return titleB.localeCompare(titleA);
          case 'date_desc':
          default: return dateB - dateA;
        }
      });
  }, [userLists, searchQuery, sortRule]);

  // Pagination Logic
  const effectiveItemsPerPage = itemsPerPage === 'All' ? Math.max(processedLists.length, 1) : itemsPerPage;
  const totalPages = Math.max(1, Math.ceil(processedLists.length / effectiveItemsPerPage));

  const paginatedLists = useMemo(() => {
    if (itemsPerPage === 'All') return processedLists;
    const startingIndex = (currentPage - 1) * itemsPerPage;
    return processedLists.slice(startingIndex, startingIndex + itemsPerPage);
  }, [processedLists, currentPage, itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const handleItemsPerPageChange = (value) => {
    const newValue = value === 'All' ? 'All' : Number(value);
    setItemsPerPage(newValue);
    localStorage.setItem('cartridge_lists_per_page', String(newValue));
    setCurrentPage(1);
  };

  return (
    <DashboardLayout
      showSearch
      searchValue={searchQuery}
      searchPlaceholder="Search your lists..."
      onSearchChange={(value) => {
        setSearchQuery(value);
        setCurrentPage(1);
      }}
    >
      {/* Add Game Modal (Bridge for List Modals) */}
      <AddGameModal 
        isOpen={isAddGameModalOpen} 
        onClose={() => {
          setIsAddGameModalOpen(false);
          if (editListDraft) {
            setListToEdit(editListDraft.list);
          } else if (returnToListModal) {
            setIsCreateListOpen(true);
            setReturnToListModal(false);
          }
        }} 
        onSaveSuccess={(newEntryData) => {
          fetchPageData();
          const finalEntryId = typeof newEntryData === 'object' ? (newEntryData?._id || newEntryData?.entryId) : newEntryData;
          if (returnToListModal && finalEntryId) setTempSelectedEntryIds(prev => [...prev, finalEntryId]);
          if (editListDraft && finalEntryId) {
            setEditListDraft(prev => ({ ...prev, selectedEntryIds: [...prev.selectedEntryIds, finalEntryId] }));
          }
        }}
      />

      {/* Create List Modal */}
      <CreateListModal 
        isOpen={isCreateListOpen}
        onClose={() => {
          setIsCreateListOpen(false);
          setTempListName('');
          setTempSelectedEntryIds([]);
        }}
        prefilledName={tempListName}
        prefilledSelectedIds={tempSelectedEntryIds}
        onStateChange={(name, ids) => {
          setTempListName(name);
          setTempSelectedEntryIds(ids);
        }}
        onListCreated={() => fetchPageData()}
        onOpenAddGameModal={() => {
          setReturnToListModal(true);
          setIsCreateListOpen(false);
          setIsAddGameModalOpen(true);
        }}
      />

      {/* Edit List Modal */}
      <EditListModal
        isOpen={listToEdit !== null}
        list={listToEdit}
        draftSnapshot={editListDraft}
        onClose={() => {
          setListToEdit(null);
          setEditListDraft(null);
        }}
        onListUpdated={() => fetchPageData()}
        onListDeleted={() => fetchPageData()}
        onOpenAddGameModal={(draft) => {
          setEditListDraft(draft);
          setListToEdit(null);
          setIsAddGameModalOpen(true);
        }}
      />

      {/* Header Section */}
      <section style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div>
            <h1 className="font-vt323" style={{ margin: 0, color: '#143910', fontSize: '42px', letterSpacing: '1px', lineHeight: 1 }}>
              My Lists
            </h1>
            <p style={{ margin: '8px 0 0 0', color: '#6B7280', fontSize: '14px' }}>
              Showing {processedLists.length} {processedLists.length === 1 ? 'list' : 'lists'}
              {userLists.length !== processedLists.length && ` out of ${userLists.length}`}.
            </p>
          </div>
          <Button variant="primary" onClick={() => setIsCreateListOpen(true)} style={{ padding: '10px 20px', fontSize: '14px' }}>
            + Add List
          </Button>
        </div>
      </section>

      {error && (
        <div role="alert" style={{ marginBottom: '24px', padding: '14px 16px', borderRadius: '8px', border: '1px solid #FCA5A5', backgroundColor: '#FEF2F2', color: '#B91C1C', fontSize: '14px', fontWeight: '600' }}>
          {error}
        </div>
      )}

      {/* Layout Grid: Sorting Sidebar + Content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Sorting controls */}
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label htmlFor="list-sort" style={{ color: '#143910', fontSize: '14px', fontWeight: '700' }}>
              Sort By:
            </label>
            <select
              id="list-sort"
              value={sortRule}
              onChange={(e) => { setSortRule(e.target.value); setCurrentPage(1); }}
              style={{ padding: '9px 10px', borderRadius: '6px', border: '2px solid #143910', backgroundColor: '#FFFFFF', color: '#143910', fontFamily: 'Inter', fontSize: '13px', fontWeight: '600', outline: 'none' }}
            >
              <option value="date_desc">Last Updated: Newest</option>
              <option value="date_asc">Last Updated: Oldest</option>
              <option value="title_asc">Title: A–Z</option>
              <option value="title_desc">Title: Z–A</option>
            </select>
          </div>
        </div>

        {/* Content */}
        <section>
          {isLoading ? (
            <div style={{ padding: '70px 20px', textAlign: 'center', color: '#143910', fontSize: '15px', fontWeight: '700' }}>
              Loading your lists...
            </div>
          ) : userLists.length === 0 ? (
            <div style={{ padding: '70px 24px', textAlign: 'center', border: '2px dashed #98B910', borderRadius: '16px', backgroundColor: '#F9FAFB' }}>
              <div style={{ marginBottom: '14px', fontSize: '48px' }}>📋</div>
              <h2 className="font-vt323" style={{ margin: '0 0 10px 0', color: '#143910', fontSize: '30px' }}>You Have No Lists</h2>
              <p style={{ maxWidth: '440px', margin: '0 auto 22px auto', color: '#6B7280', fontSize: '14px', lineHeight: 1.5 }}>
                Group your favorite games, backlog, or genres into custom lists.
              </p>
              <Button variant="primary" onClick={() => setIsCreateListOpen(true)}>
                + Create Your First List
              </Button>
            </div>
          ) : processedLists.length === 0 ? (
            <div style={{ padding: '70px 24px', textAlign: 'center', border: '2px dashed #D1D5DB', borderRadius: '16px', backgroundColor: '#F9FAFB' }}>
              <div style={{ marginBottom: '14px', fontSize: '42px' }}>🔍</div>
              <h2 className="font-vt323" style={{ margin: '0 0 10px 0', color: '#143910', fontSize: '30px' }}>No Matching Lists</h2>
              <p style={{ margin: '0 0 20px 0', color: '#6B7280', fontSize: '14px' }}>Try changing your search query.</p>
              <Button variant="tertiary" onClick={() => setSearchQuery('')} style={{ border: '1px solid #98B910', color: '#143910' }}>
                Clear Search
              </Button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '24px' }}>
              {paginatedLists.map((list) => (
                <ListCard
                  key={list._id}
                  list={list}
                  entries={userCollection
                    .filter((entry) => getEntryListIds(entry).includes(list._id?.toString()))
                    .sort((entryA, entryB) => new Date(entryB.createdAt || 0) - new Date(entryA.createdAt || 0))
                  }
                  showActions
                  onView={() => navigate(`/collection?list=${encodeURIComponent(list._id)}`)}
                  onEdit={() => setListToEdit(list)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {!isLoading && processedLists.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap', marginTop: '32px', paddingTop: '24px', borderTop: '2px solid #F3F4F6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label htmlFor="items-per-page" style={{ color: '#6B7280', fontSize: '13px' }}>Show:</label>
                <select
                  id="items-per-page"
                  value={itemsPerPage}
                  onChange={(e) => handleItemsPerPageChange(e.target.value)}
                  style={{ padding: '7px 8px', borderRadius: '5px', border: '1px solid #D1D5DB', backgroundColor: '#FFFFFF', fontFamily: 'Inter', fontSize: '13px' }}
                >
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                  <option value="All">All lists</option>
                </select>
              </div>

              {itemsPerPage !== 'All' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <Button variant="primary" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} style={{ padding: '8px 14px' }}>Previous</Button>
                  <span style={{ color: '#374151', fontSize: '13px', fontWeight: '700' }}>Page {currentPage} of {totalPages}</span>
                  <Button variant="primary" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} style={{ padding: '8px 14px' }}>Next</Button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}