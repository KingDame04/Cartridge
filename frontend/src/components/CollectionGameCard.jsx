import React from 'react';

export default function CollectionGameCard({
  entry,
  listNames = [],
  onClick
}) {
  if (!entry) return null;

  const gameObject =
    entry.gameId && typeof entry.gameId === 'object'
      ? entry.gameId
      : null;

  const title =
    entry.name ||
    gameObject?.name ||
    'Unknown Game';

  const coverImage =
    entry.coverImage ||
    gameObject?.coverImage ||
    null;

  const platform =
    entry.platformPlayed ||
    'Platform not specified';

  const hoursPlayed =
    Number(entry.hoursPlayed) || 0;

  const rating =
    Math.max(0, Math.min(5, Number(entry.rating) || 0));

  const genresSource =
    entry.genres?.length > 0
      ? entry.genres
      : gameObject?.genres || [];

  const genres = Array.isArray(genresSource)
    ? genresSource
        .map((genre) =>
          typeof genre === 'string' ? genre : genre?.name
        )
        .filter(Boolean)
    : [];

  const genresText =
    genres.length > 0
      ? genres.slice(0, 3).join(', ')
      : 'Genre not available';

  const dateAddedSource =
    entry.createdAt ||
    entry.dateAdded ||
    null;

  const formattedDateAdded = dateAddedSource
    ? new Date(dateAddedSource).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : 'Unknown date';

  const normalizedListNames = Array.isArray(listNames)
    ? listNames.filter(Boolean)
    : [];

  const renderStars = (ratingCount) => {
    return (
      '★'.repeat(ratingCount) +
      '☆'.repeat(5 - ratingCount)
    );
  };

  const handleKeyDown = (event) => {
    if (!onClick) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={{
        width: '100%',
        minWidth: 0,
        height: '100%',
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
        transition:
          'transform 0.2s ease, box-shadow 0.2s ease',
        outline: 'none'
      }}
      onMouseEnter={(event) => {
        if (!onClick) return;

        event.currentTarget.style.transform =
          'translateY(-4px)';
        event.currentTarget.style.boxShadow =
          '0 8px 18px rgba(0, 0, 0, 0.10)';
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.transform =
          'translateY(0)';
        event.currentTarget.style.boxShadow =
          '0 2px 6px rgba(0, 0, 0, 0.05)';
      }}
      onFocus={(event) => {
        if (!onClick) return;

        event.currentTarget.style.boxShadow =
          '0 0 0 3px rgba(152, 185, 16, 0.35)';
      }}
      onBlur={(event) => {
        event.currentTarget.style.boxShadow =
          '0 2px 6px rgba(0, 0, 0, 0.05)';
      }}
    >
      {/* Game cover */}
      <div
        style={{
          width: '100%',
          height: '220px',
          backgroundColor: '#EBE5F0',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        {coverImage ? (
          <img
            src={coverImage}
            alt={`${title} cover`}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block'
            }}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              color: '#6B7280'
            }}
          >
            <span style={{ fontSize: '38px' }}>🎮</span>
            <span
              style={{
                fontSize: '12px',
                fontWeight: '600'
              }}
            >
              No cover available
            </span>
          </div>
        )}
      </div>

      {/* Card information */}
      <div
        style={{
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          flex: 1
        }}
      >
        <h3
          title={title}
          style={{
            margin: '0 0 6px 0',
            color: '#111827',
            fontSize: '17px',
            fontWeight: '700',
            lineHeight: 1.3,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {title}
        </h3>

        <p
          title={genres.join(', ')}
          style={{
            margin: '0 0 10px 0',
            color: '#4B5563',
            fontSize: '13px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {genresText}
        </p>

        {/* Rating */}
        <div
          style={{
            minHeight: '22px',
            marginBottom: '8px'
          }}
        >
          {rating > 0 ? (
            <span
              aria-label={`${rating} out of 5 stars`}
              style={{
                color: '#FFD700',
                fontSize: '16px',
                letterSpacing: '2px'
              }}
            >
              {renderStars(rating)}
            </span>
          ) : (
            <span
              style={{
                color: '#143910',
                fontSize: '12px',
                fontWeight: '600'
              }}
            >
              Not rated yet
            </span>
          )}
        </div>

        {/* Platform and hours */}
        <div
          style={{
            marginBottom: '12px',
            color: '#4B5563',
            fontSize: '12px',
            fontWeight: '600'
          }}
        >
          {platform}
          {hoursPlayed > 0 && ` • ${hoursPlayed} hrs`}
        </div>

        {/* List tags */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            minHeight: '26px',
            marginBottom: '14px'
          }}
        >
          {normalizedListNames.length > 0 ? (
            normalizedListNames.slice(0, 3).map((listName) => (
              <span
                key={listName}
                style={{
                  maxWidth: '100%',
                  padding: '4px 9px',
                  borderRadius: '12px',
                  backgroundColor: '#EDF4CD',
                  color: '#143910',
                  fontSize: '11px',
                  fontWeight: '700',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                title={listName}
              >
                {listName}
              </span>
            ))
          ) : (
            <span
              style={{
                color: '#9CA3AF',
                fontSize: '11px',
                fontStyle: 'italic'
              }}
            >
              Not assigned to a list
            </span>
          )}

          {normalizedListNames.length > 3 && (
            <span
              style={{
                padding: '4px 9px',
                borderRadius: '12px',
                backgroundColor: '#E5E7EB',
                color: '#4B5563',
                fontSize: '11px',
                fontWeight: '700'
              }}
            >
              +{normalizedListNames.length - 3}
            </span>
          )}
        </div>

        {/* Date added */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: '12px',
            borderTop: '1px solid #E5E7EB',
            color: '#6B7280',
            fontSize: '11px'
          }}
        >
          Added {formattedDateAdded}
        </div>
      </div>
    </div>
  );
}