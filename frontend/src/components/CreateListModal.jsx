import React, {
  useState,
  useEffect,
  useContext,
  useMemo,
  useRef
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

function getGameTitle(entry) {
  const game = getGameObject(entry);

  return (
    game?.name ||
    entry?.name ||
    'Unknown Game'
  );
}

function getGameCover(entry) {
  const game = getGameObject(entry);

  return (
    game?.coverImage ||
    entry?.coverImage ||
    null
  );
}

function getEntryCreatedTime(entry) {
  const dateValue =
    entry?.createdAt ||
    entry?.dateAdded ||
    0;

  const time = new Date(dateValue).getTime();

  return Number.isNaN(time) ? 0 : time;
}

function normalizeIds(ids) {
  return Array.isArray(ids)
    ? ids
        .map((id) => id?.toString())
        .filter(Boolean)
    : [];
}

export default function CreateListModal({
  isOpen,
  onClose,
  onListCreated,
  onOpenAddGameModal,
  prefilledName = '',
  prefilledSelectedIds = [],
  onStateChange
}) {
  const { token } = useContext(AuthContext);

  const currentToken =
    token || localStorage.getItem('token');

  const [name, setName] = useState('');
  const [userEntries, setUserEntries] =
    useState([]);
  const [
    selectedEntryIds,
    setSelectedEntryIds
  ] = useState([]);

  // 🟢 Local game search state
  const [gameSearch, setGameSearch] = useState('');

  const [isLoading, setIsLoading] =
    useState(false);
  const [isSubmitting, setIsSubmitting] =
    useState(false);
  const [error, setError] = useState('');

  const latestPrefilledNameRef =
    useRef(prefilledName || '');

  const latestPrefilledIdsRef =
    useRef(normalizeIds(prefilledSelectedIds));

  useEffect(() => {
    latestPrefilledNameRef.current =
      prefilledName || '';
  }, [prefilledName]);

  useEffect(() => {
    latestPrefilledIdsRef.current =
      normalizeIds(prefilledSelectedIds);
  }, [prefilledSelectedIds]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isCancelled = false;

    const loadCollection = async () => {
      try {
        setName(latestPrefilledNameRef.current);
        setSelectedEntryIds(
          latestPrefilledIdsRef.current
        );
        setGameSearch(''); // Reset search when opened

        setIsLoading(true);
        setError('');

        if (!currentToken) {
          throw new Error(
            'You must be logged in to create a list.'
          );
        }

        const response = await api.get(
          '/user-game-entries/collection',
          currentToken
        );

        const responseData = await response
          .json()
          .catch(() => []);

        if (!response.ok) {
          throw new Error(
            responseData.error ||
              responseData.message ||
              'Failed to load your collection.'
          );
        }

        const entries = Array.isArray(responseData)
          ? responseData
          : [];

        if (!isCancelled) {
          setUserEntries(entries);
        }
      } catch (loadError) {
        console.error(
          'Failed to load collection games for list creation:',
          loadError
        );

        if (!isCancelled) {
          setUserEntries([]);
          setError(
            loadError.message ||
              'Failed to load your collection.'
          );
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
  }, [isOpen, currentToken]);

  const sortedEntries = useMemo(() => {
    return [...userEntries].sort(
      (entryA, entryB) =>
        getEntryCreatedTime(entryB) -
        getEntryCreatedTime(entryA)
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
    const selectedIdSet = new Set(
      selectedEntryIds
    );

    return sortedEntries.filter((entry) =>
      selectedIdSet.has(getEntryId(entry))
    );
  }, [sortedEntries, selectedEntryIds]);

  const selectedCovers = useMemo(() => {
    return selectedEntries
      .map(getGameCover)
      .filter(Boolean)
      .slice(0, 4);
  }, [selectedEntries]);

  const savedCoverImage =
    selectedCovers[0] || null;

  const previewTiles = useMemo(() => {
    return Array.from(
      { length: 4 },
      (_, index) =>
        selectedCovers[index] || null
    );
  }, [selectedCovers]);

  if (!isOpen) {
    return null;
  }

  const notifyParentState = (
    updatedName,
    updatedIds
  ) => {
    if (onStateChange) {
      onStateChange(
        updatedName,
        updatedIds
      );
    }
  };

  const handleNameChange = (event) => {
    const updatedName = event.target.value;

    setName(updatedName);
    setError('');

    notifyParentState(
      updatedName,
      selectedEntryIds
    );
  };

  const handleToggleEntry = (
    entryId,
    checked
  ) => {
    if (!entryId) {
      return;
    }

    setSelectedEntryIds((currentIds) => {
      const updatedIds = checked
        ? currentIds.includes(entryId)
          ? currentIds
          : [...currentIds, entryId]
        : currentIds.filter(
            (id) => id !== entryId
          );

      notifyParentState(name, updatedIds);

      return updatedIds;
    });

    setError('');
  };

  const handleOpenAddGame = () => {
    notifyParentState(
      name,
      selectedEntryIds
    );

    if (onOpenAddGameModal) {
      onOpenAddGameModal();
    }
  };

  const handleCreateList = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('A list name is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const payload = {
        name: trimmedName,
        isPublic: false,
        coverImage: savedCoverImage,
        entryIds: selectedEntryIds
      };

      const response = await api.post(
        '/lists',
        payload,
        currentToken
      );

      const responseData = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          responseData.error ||
            responseData.message ||
            'Failed to create list.'
        );
      }

      if (onListCreated) {
        onListCreated(
          responseData.list,
          responseData.assignedEntryIds || []
        );
      }

      onClose();
    } catch (createError) {
      console.error(
        'Failed to create list:',
        createError
      );

      setError(
        createError.message ||
          'Failed to create list.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBusy =
    isLoading || isSubmitting;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-list-title"
      style={{
        position: 'fixed',
        inset: 0,
        padding: '20px',
        backgroundColor:
          'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 120,
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
          boxShadow:
            '0 12px 32px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxSizing: 'border-box'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom:
              '2px solid #E5E7EB',
            display: 'flex',
            justifyContent:
              'space-between',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <h2
            id="create-list-title"
            className="font-vt323"
            style={{
              margin: 0,
              color: '#143910',
              fontSize: '30px',
              letterSpacing: '1px'
            }}
          >
            Create New List
          </h2>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close create list modal"
            style={{
              padding: '4px 8px',
              border: 'none',
              background: 'none',
              color: '#143910',
              fontSize: '20px',
              fontWeight: '700',
              cursor: isSubmitting
                ? 'not-allowed'
                : 'pointer',
              opacity: isSubmitting
                ? 0.5
                : 1
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            padding: '24px 32px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}
        >
          {error && (
            <div
              role="alert"
              style={{
                padding: '12px 14px',
                border:
                  '1px solid #FCA5A5',
                borderRadius: '6px',
                backgroundColor:
                  '#FEF2F2',
                color: '#B91C1C',
                fontSize: '13px',
                fontWeight: '600'
              }}
            >
              {error}
            </div>
          )}

          {/* List name */}
          <div>
            <label
              htmlFor="new-list-name"
              style={{
                display: 'block',
                marginBottom: '5px',
                color: '#143910',
                fontSize: '13px',
                fontWeight: '700'
              }}
            >
              List Name *
            </label>

            <input
              id="new-list-name"
              type="text"
              placeholder="e.g. Favorite RPGs"
              value={name}
              onChange={handleNameChange}
              disabled={isSubmitting}
              maxLength={100}
              autoFocus
              style={{
                width: '100%',
                padding: '10px 12px',
                border:
                  '2px solid #143910',
                borderRadius: '5px',
                backgroundColor:
                  isSubmitting
                    ? '#F3F4F6'
                    : '#FFFFFF',
                color: '#111827',
                fontFamily: 'Inter',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Preview and collection selector */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '28px',
              flexWrap: 'wrap'
            }}
          >
            {/* Portrait collage preview */}
            <div
              style={{
                flex: '0 1 250px',
                minWidth: '220px'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent:
                    'space-between',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '6px'
                }}
              >
                <span
                  style={{
                    color: '#143910',
                    fontSize: '13px',
                    fontWeight: '700'
                  }}
                >
                  Cover Preview
                </span>

                <span
                  style={{
                    color: '#6B7280',
                    fontSize: '11px'
                  }}
                >
                  Auto-generated
                </span>
              </div>

              <div
                style={{
                  width: '100%',
                  height: '100%',
                  aspectRatio: '2 / 3',
                  padding: '3px',
                  border:
                    '2px solid #143910',
                  borderRadius: '8px',
                  backgroundColor:
                    '#EBE5F0',
                  overflow: 'hidden',
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(2, minmax(0, 1fr))',
                  gridTemplateRows:
                    'repeat(2, minmax(0, 1fr))',
                  gap: '3px',
                  boxSizing: 'border-box'
                }}
              >
                {previewTiles.map(
                  (imageUrl, index) => (
                    <div
                      key={index}
                      style={{
                        minWidth: 0,
                        minHeight: 0,
                        borderRadius: '4px',
                        backgroundColor:
                          '#c3d1e4',
                        overflow: 'hidden',
                        display: 'flex',
                        justifyContent:
                          'center',
                        alignItems: 'center'
                      }}
                    >
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={`Selected game cover ${
                            index + 1
                          }`}
                          style={{
                            width: '100%',
                            height: '100%',
                            display: 'block',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <span
                          style={{
                            color: '#D1D5DB',
                            fontSize: '22px',
                            opacity: 0.6
                          }}
                        >
                          🎮
                        </span>
                      )}
                    </div>
                  )
                )}
              </div>

            </div>

            {/* Collection selector */}
            <div
              style={{
                flex: '1 1 400px',
                minWidth: '290px',
                display: 'flex',
                flexDirection: 'column',
                gap: '7px'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent:
                    'space-between',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}
              >
                <label
                  style={{
                    color: '#143910',
                    fontSize: '13px',
                    fontWeight: '700'
                  }}
                >
                  Add Games from Collection
                </label>

                <button
                  type="button"
                  onClick={handleOpenAddGame}
                  disabled={isSubmitting}
                  style={{
                    padding: 0,
                    border: 'none',
                    background: 'none',
                    color: '#2E7D32',
                    fontSize: '12px',
                    fontWeight: '700',
                    textDecoration:
                      'underline',
                    cursor: isSubmitting
                      ? 'not-allowed'
                      : 'pointer',
                    opacity: isSubmitting
                      ? 0.5
                      : 1
                  }}
                >
                  + Add new game
                </button>
              </div>

              {/* 🟢 Search input to quickly filter massive game libraries */}
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

              <div
                style={{
                  height: '320px',
                  padding: '10px',
                  border:
                    '2px solid #143910',
                  borderRadius: '6px',
                  backgroundColor:
                    '#F9FAFB',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '7px',
                  boxSizing: 'border-box'
                }}
              >
                {isLoading ? (
                  <span
                    style={{
                      padding: '14px',
                      color: '#6B7280',
                      fontSize: '13px',
                      textAlign: 'center'
                    }}
                  >
                    Loading collection...
                  </span>
                ) : sortedEntries.length ===
                  0 ? (
                  <span
                    style={{
                      padding: '14px',
                      color: '#6B7280',
                      fontSize: '13px',
                      textAlign: 'center'
                    }}
                  >
                    No games in your collection yet.
                  </span>
                ) : filteredEntries.length === 0 ? (
                  <span
                    style={{
                      padding: '14px',
                      color: '#6B7280',
                      fontSize: '13px',
                      textAlign: 'center'
                    }}
                  >
                    No games match your search.
                  </span>
                ) : (
                  filteredEntries.map((entry) => {
                    const entryId =
                      getEntryId(entry);

                    const gameTitle =
                      getGameTitle(entry);

                    const coverImage =
                      getGameCover(entry);

                    const isChecked =
                      selectedEntryIds.includes(
                        entryId
                      );

                    return (
                      <label
                        key={entryId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '7px',
                          borderRadius: '5px',
                          backgroundColor:
                            isChecked
                              ? '#F0F7D6'
                              : '#FFFFFF',
                          color: '#111827',
                          fontSize: '13px',
                          cursor: 'pointer'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={
                            isSubmitting
                          }
                          onChange={(event) =>
                            handleToggleEntry(
                              entryId,
                              event.target
                                .checked
                            )
                          }
                          style={{
                            width: '16px',
                            height: '16px',
                            flexShrink: 0
                          }}
                        />

                        <div
                          style={{
                            width: '42px',
                            height: '62px',
                            borderRadius: '4px',
                            backgroundColor:
                              '#b0c3dd',
                            overflow: 'hidden',
                            flexShrink: 0,
                            display: 'flex',
                            justifyContent:
                              'center',
                            alignItems: 'center'
                          }}
                        >
                          {coverImage ? (
                            <img
                              src={coverImage}
                              alt=""
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit:
                                  'cover',
                                backgroundColor:
                                  '#d0e2fb'
                              }}
                            />
                          ) : (
                            <span>🎮</span>
                          )}
                        </div>

                        <span
                          title={gameTitle}
                          style={{
                            minWidth: 0,
                            fontWeight: '600',
                            whiteSpace:
                              'nowrap',
                            overflow: 'hidden',
                            textOverflow:
                              'ellipsis'
                          }}
                        >
                          {gameTitle}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>

              <span
                style={{
                  color: '#6B7280',
                  fontSize: '11px'
                }}
              >
                {selectedEntryIds.length}{' '}
                {selectedEntryIds.length === 1
                  ? 'game selected'
                  : 'games selected'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 32px',
            borderTop:
              '2px solid #E5E7EB',
            backgroundColor: '#F9FAFB',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
          }}
        >
          <Button
            variant="tertiary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          <Button
            variant="primary"
            onClick={handleCreateList}
            disabled={
              !name.trim() ||
              isBusy
            }
          >
            {isSubmitting
              ? 'Creating...'
              : 'Create List'}
          </Button>
        </div>
      </div>
    </div>
  );
}