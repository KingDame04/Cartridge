import React, { useState } from 'react';
import Button from './Button';

export default function GameDetailModal({ isOpen, onClose, entry, userLists = [], onEdit }) {
  const [showAllGenres, setShowAllGenres] = useState(false);

  if (!isOpen || !entry) return null;

  const gameObj = (entry.gameId && typeof entry.gameId === 'object') ? entry.gameId : null;
  
  const title = entry.name || gameObj?.name || 'Unknown Game';
  const coverImage = entry.coverImage || gameObj?.coverImage || null;
  const platform = entry.platformPlayed || 'Not specified';
  const hours = entry.hoursPlayed || 0;
  const rating = entry.rating || 0;
  const review = entry.review || 'No review written yet.';
  const played = entry.played;

  const entryListIds = Array.isArray(entry.listIds) 
    ? entry.listIds.map(id => typeof id === 'object' ? id._id?.toString() : id?.toString()) 
    : [];
  const assignedLists = userLists.filter(l => entryListIds.includes(l._id?.toString())).map(l => l.name);
  const listsText = assignedLists.length > 0 ? assignedLists.join(', ') : 'None';

  const devsSource = entry.developers?.length > 0 ? entry.developers : gameObj?.developers;
  const dev = Array.isArray(devsSource) && devsSource.length > 0
    ? (typeof devsSource[0] === 'string' ? devsSource[0] : devsSource[0]?.name)
    : null;

  const releaseDateSource = entry.releaseDate || gameObj?.releaseDate;
  const year = typeof releaseDateSource === 'string' ? releaseDateSource.substring(0, 4) : null;
  
  const devAndYear = [dev && dev !== 'Unknown Developer' ? dev : null, year].filter(Boolean).join(' • ');

  const genresSource = entry.genres?.length > 0 ? entry.genres : gameObj?.genres;
  const genresList = Array.isArray(genresSource)
    ? genresSource.map(g => (typeof g === 'string' ? g : g?.name)).filter(Boolean)
    : [];
  const genresText = genresList.join(', ');
  const isLongGenres = genresText.length > 40;

  const renderStars = (count) => "★".repeat(count) + "☆".repeat(5 - count);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        width: '100%', maxWidth: '480px', maxHeight: '90vh',
        borderRadius: '16px', border: '4px solid #143910',
        boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
        display: 'flex', flexDirection: 'column',
        boxSizing: 'border-box', overflow: 'hidden'
      }}>
        
        <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', borderBottom: '2px solid #E5E7EB' }}>
          <button 
            onClick={onClose}
            style={{
              background: 'none', border: 'none', fontSize: '20px', fontWeight: 'bold',
              color: '#143910', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px'
            }}
            title="Close"
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
          
          <div style={{ display: 'flex', gap: '20px', marginBottom: '24px', alignItems: 'flex-start' }}>
            <div style={{
              width: '110px', height: '150px', borderRadius: '8px', overflow: 'hidden',
              backgroundColor: '#FFFFFF', border: '2px solid #143910', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {coverImage ? (
                <img src={coverImage} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ color: '#6B7280', fontSize: '12px' }}>No Img</span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden', width: '100%' }}>
              <h2 className="font-vt323" style={{ fontSize: '30px', color: '#143910', margin: '0 0 4px 0', lineHeight: 1.1 }}>
                {title}
              </h2>
              {devAndYear && (
                <p style={{ color: '#4B5563', fontSize: '14px', margin: '0 0 6px 0', fontWeight: '600' }}>
                  {devAndYear}
                </p>
              )}
              {genresList.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ 
                    color: '#2e7d32', 
                    fontSize: '13px', 
                    fontWeight: 'bold', 
                    whiteSpace: showAllGenres ? 'normal' : 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis',
                    width: '100%',
                    display: 'block'
                  }}>
                    {genresText}
                  </span>
                  {isLongGenres && (
                    <button 
                      onClick={() => setShowAllGenres(!showAllGenres)} 
                      style={{ 
                        background: 'none', border: 'none', color: '#143910', fontSize: '12px', 
                        cursor: 'pointer', padding: '4px 0 0 0', fontWeight: 'bold', textDecoration: 'underline' 
                      }}
                    >
                      {showAllGenres ? 'Show less' : 'Show more...'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={{
            backgroundColor: '#F9FAFB', borderRadius: '12px', padding: '20px',
            border: '2px solid #143910', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#143910', margin: 0, borderBottom: '2px solid #E5E7EB', paddingBottom: '6px' }}>
              Your Entry Details
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '10px', alignItems: 'center', fontSize: '14px' }}>
              <span style={{ fontWeight: '700', color: '#4B5563' }}>Status:</span>
              <span style={{ color: played ? '#2e7d32' : '#D97706', fontWeight: '700' }}>
                {played ? '✓ Played' : 'In Progress'}
              </span>

              <span style={{ fontWeight: '700', color: '#4B5563' }}>Platform:</span>
              <span style={{ color: '#111827', fontWeight: '600' }}>{platform}</span>

              <span style={{ fontWeight: '700', color: '#4B5563' }}>Hours Played:</span>
              <span style={{ color: '#111827', fontWeight: '600' }}>{hours} hrs</span>

              <span style={{ fontWeight: '700', color: '#4B5563' }}>Rating:</span>
              <span style={{ color: '#FFD700', fontSize: '18px', letterSpacing: '2px' }}>
                {rating > 0 ? renderStars(rating) : <span style={{ color: '#9CA3AF', fontSize: '14px', fontStyle: 'italic' }}>Unrated</span>}
              </span>

              <span style={{ fontWeight: '700', color: '#4B5563' }}>Lists:</span>
              <span style={{ color: '#111827', fontWeight: '600' }}>{listsText}</span>
            </div>

            <div>
              <span style={{ fontWeight: '700', color: '#4B5563', display: 'block', marginBottom: '4px', fontSize: '14px' }}>Review:</span>
              <div style={{
                backgroundColor: '#FFFFFF', padding: '10px', borderRadius: '6px',
                border: '1px solid #E5E7EB', color: '#374151', fontSize: '13px', fontStyle: review === 'No review written yet.' ? 'italic' : 'normal',
                minHeight: '50px', whiteSpace: 'pre-wrap'
              }}>
                {review}
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '16px 32px', backgroundColor: '#FFFFFF', borderTop: '2px solid #E5E7EB', display: 'flex' }}>
          <Button 
            variant="primary" 
            style={{ width: '100%', padding: '10px', justifyContent: 'center' }}
            onClick={() => onEdit(entry)}
          >
            Edit Game Entry
          </Button>
        </div>

      </div>
    </div>
  );
}