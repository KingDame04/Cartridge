import React, {
  useState,
  useEffect,
  useContext,
  useMemo
} from 'react';

import Button from './Button';
import { api } from '../api';
import { AuthContext } from '../context/AuthContext';

function getEntryId(entry) {
  return (
    entry?._id?.toString() ||
    entry?.entryId?.toString() ||
    ''
  );
}

function getGameObject(entry) {
  return entry?.gameId &&
    typeof entry.gameId === 'object'
    ? entry.gameId
    : null;
}

function getGameId(entry) {
  const game = getGameObject(entry);

  if (game?._id) {
    return game._id.toString();
  }

  if (
    entry?.gameId &&
    typeof entry.gameId !== 'object'
  ) {
    return entry.gameId.toString();
  }

  return '';
}

function getGameTitle(entry) {
  const game = getGameObject(entry);

  return (
    game?.name ||
    entry?.name ||
    'Unknown Game'
  );
}

function getCoverImage(entry) {
  const game = getGameObject(entry);

  return (
    game?.coverImage ||
    entry?.coverImage ||
    null
  );
}

function getEntryListIds(entry) {
  if (!Array.isArray(entry?.listIds)) {
    return [];
  }

  return entry.listIds
    .map((listId) => {
      if (
        listId &&
        typeof listId === 'object'
      ) {
        return listId._id?.toString();
      }

      return listId?.toString();
    })
    .filter(Boolean);
}

function getEntryCreatedTime(entry) {
  const value =
    entry?.createdAt ||
    entry?.dateAdded ||
    0;

  const time = new Date(value).getTime();

  return Number.isNaN(time) ? 0 : time;
}

export default function EditListModal({
  isOpen,
  list,
  draftSnapshot,
  onClose,
  onListUpdated,
  onListDeleted,
  onOpenAddGameModal
}) {
  const { token } = useContext(AuthContext);

  const currentToken =
    token || localStorage.getItem('token');

  const [name, setName] = useState('');
  const [userEntries, setUserEntries] = useState([]);

  const [originalSelectedEntryIds, setOriginalSelectedEntryIds] = useState([]);
  const [selectedEntryIds, setSelectedEntryIds] = useState([]);

  // 🟢 Local game search state
  const [gameSearch, setGameSearch] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [error, setError] = useState('');

  const listId = list?._id?.toString() || '';

  useEffect(() => {
    if (!isOpen || !list || !currentToken) {
      return;
    }

    let isCancelled = false;

    const loadCollection = async () => {
      try {
        setIsLoading(true);
        setError('');
        setGameSearch(''); // Reset search on open

        const response = await api.get('/user-game-entries/collection', currentToken);
        const responseData = await response.json().catch(() => []);

        if (!response.ok) {
          throw new Error(responseData.error || responseData.message || 'Failed to load your collection.');
        }

        const entries = Array.isArray(responseData) ? responseData : [];

        const currentMembership = entries
          .filter((entry) => getEntryListIds(entry).includes(listId))
          .map(getEntryId)
          .filter(Boolean);

        if (!isCancelled) {
          setUserEntries(entries);
          setShowDeleteConfirmation(false);

          if (draftSnapshot && draftSnapshot.list._id === listId) {
            setName(draftSnapshot.name);
            setOriginalSelectedEntryIds(draftSnapshot.originalSelectedEntryIds);
            setSelectedEntryIds(draftSnapshot.selectedEntryIds);
          } else {
            setName(list.name || '');
            setOriginalSelectedEntryIds(currentMembership);
            setSelectedEntryIds(currentMembership);
          }
        }
      } catch (loadError) {
        console.error('Failed to load collection for list editing:', loadError);

        if (!isCancelled) {
          setError(loadError.message || 'Failed to load your collection.');
          setUserEntries([]);
          setOriginalSelectedEntryIds([]);
          setSelectedEntryIds([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadCollection();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, list, listId, currentToken, draftSnapshot]);

  const sortedEntries = useMemo(() => {
    return [...userEntries].sort(
      (entryA, entryB) =>
        getEntryCreatedTime(entryB) - getEntryCreatedTime(entryA)
    );
  }, [userEntries]);

  // 🟢 Filter collection entries based on the search query input
  const filteredEntries = useMemo(() => {
    const query = gameSearch.trim().toLowerCase();
    if (!query) {
      return sortedEntries;
    }

    return sortedEntries.filter((entry) => {
      const title = getGameTitle(entry).toLowerCase();
      return title.includes(query);
    });
  }, [sortedEntries, gameSearch]);

  const selectedEntries = useMemo(() => {
    const selectedIds = new Set(selectedEntryIds);
    return sortedEntries.filter((entry) => selectedIds.has(getEntryId(entry)));
  }, [sortedEntries, selectedEntryIds]);

  const selectedCoverImages = useMemo(() => {
    return selectedEntries
      .map(getCoverImage)
      .filter(Boolean)
      .slice(0, 4);
  }, [selectedEntries]);

  const previewTiles = useMemo(() => {
    return Array.from({ length: 4 }, (_, index) => selectedCoverImages[index] || null);
  }, [selectedCoverImages]);

  const generatedCoverImage = selectedCoverImages[0] || null;
  const trimmedName = name.trim();

  const membershipChanged = useMemo(() => {
    if (selectedEntryIds.length !== originalSelectedEntryIds.length) {
      return true;
    }

    const originalSet = new Set(originalSelectedEntryIds);
    return selectedEntryIds.some((entryId) => !originalSet.has(entryId));
  }, [selectedEntryIds, originalSelectedEntryIds]);

  const nameChanged = trimmedName !== (list?.name?.trim() || '');
  const coverChanged = generatedCoverImage !== (list?.coverImage || null);
  const hasChanges = nameChanged || membershipChanged || coverChanged;

  const isBusy = isSaving || isDeleting || isLoading;

  const handleToggleEntry = (entryId, checked) => {
    if (!entryId) return;

    setSelectedEntryIds((currentIds) => {
      if (checked) {
        return currentIds.includes(entryId) ? currentIds : [...currentIds, entryId];
      }
      return currentIds.filter((currentId) => currentId !== entryId);
    });

    setError('');
  };

  const handleOpenAddGame = () => {
    if (!onOpenAddGameModal) return;

    onOpenAddGameModal({
      list,
      name,
      selectedEntryIds: [...selectedEntryIds],
      originalSelectedEntryIds: [...originalSelectedEntryIds]
    });
  };

  const handleClose = () => {
    if (isSaving || isDeleting) return;

    setError('');
    setShowDeleteConfirmation(false);
    onClose();
  };

  const getTitleByEntryId = (entryId) => {
    const matchingEntry = userEntries.find((entry) => getEntryId(entry) === entryId);
    return matchingEntry ? getGameTitle(matchingEntry) : 'game';
  };

  const handleSave = async () => {
    if (!listId) {
      setError('This list does not have a valid ID.');
      return;
    }

    if (!trimmedName) {
      setError('A list name is required.');
      return;
    }

    if (!hasChanges) {
      handleClose();
      return;
    }

    try {
      setIsSaving(true);
      setError('');

      const originalSet = new Set(originalSelectedEntryIds);
      const selectedSet = new Set(selectedEntryIds);

      const entryIdsToAdd = selectedEntryIds.filter((id) => !originalSet.has(id));
      const entryIdsToRemove = originalSelectedEntryIds.filter((id) => !selectedSet.has(id));

      const getGameIdByEntryId = (eId) => {
        const matchingEntry = userEntries.find((entry) => getEntryId(entry) === eId);
        return matchingEntry ? getGameId(matchingEntry) : null;
      };

      const addRequests = entryIdsToAdd.map(async (eId) => {
        const gameId = getGameIdByEntryId(eId);
        if (!gameId) return;

        const response = await api.post(`/user-game-entries/lists/${listId}/games/${gameId}`, {}, currentToken);
        const responseData = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(responseData.error || responseData.message || `Failed to add ${getTitleByEntryId(eId)} to the list.`);
        }
        return responseData;
      });

      const removeRequests = entryIdsToRemove.map(async (eId) => {
        const gameId = getGameIdByEntryId(eId);
        if (!gameId) return;

        const response = await api.delete(`/user-game-entries/lists/${listId}/games/${gameId}`, currentToken);
        const responseData = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(responseData.error || responseData.message || `Failed to remove ${getTitleByEntryId(eId)} from the list.`);
        }
        return responseData;
      });

      await Promise.all([...addRequests, ...removeRequests]);

      const updatePayload = {};
      if (nameChanged) updatePayload.name = trimmedName;
      if (coverChanged || membershipChanged) updatePayload.coverImage = generatedCoverImage;

      let updatedList = { ...list, name: trimmedName, coverImage: generatedCoverImage };

      if (Object.keys(updatePayload).length > 0) {
        const listResponse = await api.patch(`/lists/${listId}`, updatePayload, currentToken);
        const listResponseData = await listResponse.json().catch(() => ({}));

        if (!listResponse.ok) {
          throw new Error(listResponseData.error || listResponseData.message || 'Game membership changed, but list details could not be updated.');
        }

        updatedList = listResponseData.list || updatedList;
      }

      setOriginalSelectedEntryIds([...selectedEntryIds]);

      if (onListUpdated) {
        onListUpdated(updatedList);
      }

      onClose();
    } catch (saveError) {
      console.error('Failed to save list changes:', saveError);
      setError(saveError.message || 'Failed to save list changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!listId) {
      setError('This list does not have a valid ID.');
      return;
    }

    try {
      setIsDeleting(true);
      setError('');

      const response = await api.delete(`/lists/${listId}`, currentToken);
      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(responseData.error || responseData.message || 'Failed to delete list.');
      }

      if (onListDeleted) {
        onListDeleted(listId);
      }

      onClose();
    } catch (deleteError) {
      console.error('Failed to delete list:', deleteError);
      setError(deleteError.message || 'Failed to delete list.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen || !list) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-list-title"
      style={{
        position: 'fixed',
        inset: 0,
        padding: '20px',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 130,
        boxSizing: 'border-box'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '860px',
          maxHeight: '90vh',
          backgroundColor: '#FFFFFF',
          border: '4px solid #143910',
          borderRadius: '16px',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxSizing: 'border-box'
        }}
      >
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '2px solid #E5E7EB',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <h2
            id="edit-list-title"
            className="font-vt323"
            style={{ margin: 0, color: '#143910', fontSize: '30px', letterSpacing: '1px' }}
          >
            Edit List
          </h2>

          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving || isDeleting}
            style={{
              padding: '4px 8px', border: 'none', background: 'none', color: '#143910',
              fontSize: '20px', fontWeight: '700', cursor: isSaving || isDeleting ? 'not-allowed' : 'pointer',
              opacity: isSaving || isDeleting ? 0.5 : 1
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && (
            <div role="alert" style={{ padding: '12px 14px', border: '1px solid #FCA5A5', borderRadius: '6px', backgroundColor: '#FEF2F2', color: '#B91C1C', fontSize: '13px', fontWeight: '600' }}>
              {error}
            </div>
          )}

          <div>
            <label htmlFor="edit-list-name" style={{ display: 'block', marginBottom: '5px', color: '#143910', fontSize: '13px', fontWeight: '700' }}>
              List Name *
            </label>
            <input
              id="edit-list-name"
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError('');
              }}
              disabled={isBusy}
              maxLength={100}
              autoFocus
              style={{
                width: '100%', padding: '10px 12px', border: '2px solid #143910', borderRadius: '5px',
                backgroundColor: isBusy ? '#F3F4F6' : '#FFFFFF', color: '#111827', fontFamily: 'Inter',
                fontSize: '14px', outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '28px', flexWrap: 'wrap' }}>
            <div style={{ flex: '0 1 250px', minWidth: '220px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <span style={{ color: '#143910', fontSize: '13px', fontWeight: '700' }}>Cover Preview</span>
                <span style={{ color: '#6B7280', fontSize: '11px' }}>Auto-generated</span>
              </div>
              <div
                style={{
                  width: '100%', aspectRatio: '2 / 3', padding: '3px', border: '2px solid #143910', borderRadius: '8px',
                  backgroundColor: '#EBE5F0', overflow: 'hidden', display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
                  gap: '3px', boxSizing: 'border-box'
                }}
              >
                {previewTiles.map((imageUrl, index) => (
                  <div key={index} style={{ minWidth: 0, minHeight: 0, borderRadius: '4px', backgroundColor: '#c3d1e4', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    {imageUrl ? (
                      <img src={imageUrl} alt={`Cover ${index + 1}`} style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ color: '#D1D5DB', fontSize: '22px', opacity: 0.6 }}>🎮</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ flex: '1 1 400px', minWidth: '290px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <label style={{ color: '#143910', fontSize: '13px', fontWeight: '700' }}>Games in This List</label>
                <button
                  type="button"
                  onClick={handleOpenAddGame}
                  disabled={isSaving || isDeleting || !onOpenAddGameModal}
                  style={{
                    padding: 0, border: 'none', background: 'none', color: '#2E7D32', fontSize: '12px', fontWeight: '700', textDecoration: 'underline',
                    cursor: isSaving || isDeleting || !onOpenAddGameModal ? 'not-allowed' : 'pointer',
                    opacity: isSaving || isDeleting || !onOpenAddGameModal ? 0.5 : 1
                  }}
                >
                  + Add new game
                </button>
              </div>

              {/* 🟢 Search input to quickly filter games in edit mode */}
              <input
                type="text"
                placeholder="Search games to add..."
                value={gameSearch}
                onChange={(e) => setGameSearch(e.target.value)}
                disabled={isLoading || userEntries.length === 0}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '4px',
                  border: '1px solid #143910',
                  fontFamily: 'Inter',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />

              <div style={{ height: '320px', padding: '10px', border: '2px solid #143910', borderRadius: '6px', backgroundColor: '#F9FAFB', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '7px', boxSizing: 'border-box' }}>
                {isLoading ? (
                  <span style={{ padding: '14px', color: '#6B7280', fontSize: '13px', textAlign: 'center' }}>Loading collection...</span>
                ) : sortedEntries.length === 0 ? (
                  <span style={{ padding: '14px', color: '#6B7280', fontSize: '13px', textAlign: 'center' }}>No games in your collection yet.</span>
                ) : filteredEntries.length === 0 ? (
                  <span style={{ padding: '14px', color: '#6B7280', fontSize: '13px', textAlign: 'center' }}>No games match your search.</span>
                ) : (
                  filteredEntries.map((entry) => {
                    const entryId = getEntryId(entry);
                    const gameTitle = getGameTitle(entry);
                    const cover = getCoverImage(entry);

                    const isChecked = selectedEntryIds.includes(entryId);

                    return (
                      <label
                        key={entryId}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px', padding: '7px', borderRadius: '5px',
                          backgroundColor: isChecked ? '#F0F7D6' : '#FFFFFF', color: '#111827', fontSize: '13px',
                          cursor: isSaving || isDeleting ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isSaving || isDeleting}
                          onChange={(event) => handleToggleEntry(entryId, event.target.checked)}
                          style={{ width: '16px', height: '16px', flexShrink: 0 }}
                        />
                        <div style={{ width: '42px', height: '62px', borderRadius: '4px', backgroundColor: '#b0c3dd', overflow: 'hidden', flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          {cover ? (
                            <img src={cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span>🎮</span>
                          )}
                        </div>
                        <span title={gameTitle} style={{ minWidth: 0, fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {gameTitle}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>

              <span style={{ color: '#6B7280', fontSize: '11px' }}>
                {selectedEntryIds.length} {selectedEntryIds.length === 1 ? 'game selected' : 'games selected'}
              </span>
            </div>
          </div>

          <div style={{ marginTop: '4px', paddingTop: '20px', borderTop: '2px solid #E5E7EB' }}>
            {!showDeleteConfirmation ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', color: '#991B1B', fontSize: '14px' }}>Delete List</h3>
                  <p style={{ margin: 0, color: '#6B7280', fontSize: '12px', lineHeight: 1.4 }}>Games will remain in your collection.</p>
                </div>
                <Button variant="danger" onClick={() => setShowDeleteConfirmation(true)} disabled={isBusy} style={{ flexShrink: 0, padding: '8px 12px' }}>
                  Delete
                </Button>
              </div>
            ) : (
              <div style={{ padding: '14px', border: '1px solid #FCA5A5', borderRadius: '8px', backgroundColor: '#FEF2F2' }}>
                <p style={{ margin: '0 0 8px 0', color: '#991B1B', fontSize: '13px', fontWeight: '700' }}>Delete “{list.name}”?</p>
                <p style={{ margin: '0 0 14px 0', color: '#7F1D1D', fontSize: '12px', lineHeight: 1.4 }}>This cannot be undone. The games will remain in your collection.</p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <Button variant="tertiary" onClick={() => setShowDeleteConfirmation(false)} disabled={isBusy} style={{ padding: '8px 12px' }}>
                    Keep List
                  </Button>
                  <Button variant="danger" onClick={handleDelete} disabled={isBusy} style={{ padding: '8px 12px' }}>
                    {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: '16px 32px', borderTop: '2px solid #E5E7EB', backgroundColor: '#F9FAFB', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <Button variant="tertiary" onClick={handleClose} disabled={isSaving || isDeleting}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={isBusy || !trimmedName || !hasChanges}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}