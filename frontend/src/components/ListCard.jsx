import React, { useMemo } from 'react';
import Button from './Button';

function getEntryCover(entry) {
  const game =
    entry?.gameId &&
    typeof entry.gameId === 'object'
      ? entry.gameId
      : null;

  return (
    game?.coverImage ||
    entry?.coverImage ||
    null
  );
}

function getEntryCreatedTime(entry) {
  const value =
    entry?.createdAt ||
    entry?.dateAdded ||
    0;

  const time = new Date(value).getTime();

  return Number.isNaN(time) ? 0 : time;
}

export default function ListCard({
  list,
  listName,
  entries = [],
  onView,
  onEdit,
  compact = false,
  showActions
}) {
  const name =
    list?.name ||
    listName ||
    'Untitled List';

  const savedCoverImage =
    list?.coverImage || null;

  const updatedAt =
    list?.updatedAt || null;

  const formattedUpdatedDate = updatedAt
    ? new Date(updatedAt).toLocaleDateString(
        'en-US',
        {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }
      )
    : null;

  const shouldShowActions =
    showActions ?? !compact;

  /*
   * Sort list entries newest to oldest.
   *
   * The newest game appears in the top-left tile,
   * followed by top-right, bottom-left, bottom-right.
   */
  const collageCovers = useMemo(() => {
    return [...entries]
      .sort(
        (entryA, entryB) =>
          getEntryCreatedTime(entryB) -
          getEntryCreatedTime(entryA)
      )
      .map(getEntryCover)
      .filter(Boolean)
      .slice(0, 4);
  }, [entries]);

  const collageTiles = useMemo(() => {
    return Array.from(
      { length: 4 },
      (_, index) =>
        collageCovers[index] || null
    );
  }, [collageCovers]);

  return (
    <div
      style={{
        border: '1px solid #E5E7EB',
        borderRadius: '10px',
        padding: '16px',

        minWidth: compact ? '260px' : 0,
        width: compact ? '260px' : '100%',

        backgroundColor: '#FFFFFF',
        flexShrink: 0,

        display: 'flex',
        flexDirection: 'column',

        boxShadow:
          '0 2px 6px rgba(0, 0, 0, 0.05)',

        transition:
          'transform 0.2s ease, box-shadow 0.2s ease'
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.transform =
          'translateY(-3px)';

        event.currentTarget.style.boxShadow =
          '0 7px 16px rgba(0, 0, 0, 0.10)';
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.transform =
          'translateY(0)';

        event.currentTarget.style.boxShadow =
          '0 2px 6px rgba(0, 0, 0, 0.05)';
      }}
    >
      {/* Auto-generated collage */}
      <div
        style={{
          height: compact ? '210px' : '260px',
          marginBottom: '16px',
          borderRadius: '10px',
          overflow: 'hidden',
          backgroundColor: '#EBE5F0'
        }}
      >
        {collageCovers.length > 0 ? (
          <div
            style={{
              width: '100%',
              height: '100%',

              display: 'grid',
              gridTemplateColumns:
                'repeat(2, minmax(0, 1fr))',
              gridTemplateRows:
                'repeat(2, minmax(0, 1fr))',

              gap: '2px',
              padding: '2px',
              boxSizing: 'border-box',

              backgroundColor: '#D8D0DE'
            }}
          >
            {collageTiles.map(
              (imageUrl, index) => (
                <div
                  key={index}
                  style={{
                    minWidth: 0,
                    minHeight: 0,

                    backgroundColor: '#B0A8B9',
                    overflow: 'hidden',

                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={`Game cover ${index + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'block',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '22px',
                        height: '22px',
                        backgroundColor: '#988E9F',
                        opacity: 0.5,
                        borderRadius: '3px'
                      }}
                    />
                  )}
                </div>
              )
            )}
          </div>
        ) : savedCoverImage ? (
          /*
           * Fallback for lists whose membership data has
           * not loaded yet.
           */
          <img
            src={savedCoverImage}
            alt={`${name} cover`}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              objectFit: 'cover'
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',

              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gridTemplateRows: '1fr 1fr',

              gap: '2px',
              padding: '2px',
              boxSizing: 'border-box',

              backgroundColor: '#D8D0DE'
            }}
          >
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                style={{
                  backgroundColor: '#B0A8B9',

                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <div
                  style={{
                    width: '22px',
                    height: '22px',
                    backgroundColor: '#988E9F',
                    opacity: 0.5,
                    borderRadius: '3px'
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* List information */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <h3
          title={name}
          style={{
            margin: '0 0 6px 0',
            color: '#111827',
            fontSize: '17px',
            fontWeight: '700',

            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {name}
        </h3>

        {formattedUpdatedDate && (
          <p
            style={{
              margin: '0 0 16px 0',
              color: '#6B7280',
              fontSize: '12px'
            }}
          >
            Updated {formattedUpdatedDate}
          </p>
        )}

        {shouldShowActions && (
          <div
            style={{
              display: 'flex',
              gap: '8px',
              marginTop: 'auto'
            }}
          >
            <Button
              variant="primary"
              onClick={onView}
              disabled={!onView}
              style={{
                flex: 1,
                padding: '8px 10px',
                fontSize: '13px'
              }}
            >
              View List
            </Button>

            <Button
              variant="secondary"
              onClick={onEdit}
              disabled={!onEdit}
              style={{
                flex: 1,
                padding: '8px 10px',
                fontSize: '13px'
              }}
            >
              Edit List
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}