import React from 'react';

export default function GameCard({ title, platform, rating, hoursPlayed, coverImage, onClick }) {
  const renderStars = (ratingCount) => {
    return "★".repeat(ratingCount) + "☆".repeat(5 - ratingCount);
  };

  return (
    <div 
      onClick={onClick}
      style={{ 
        border: '1px solid #E5E7EB', 
        borderRadius: '8px', 
        padding: '16px', 
        width: '200px',        
        flex: '0 0 200px',     
        backgroundColor: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
        cursor: 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div>
        <div style={{ 
          backgroundColor: '#EBE5F0', 
          height: '220px', 
          width: '100%',
          borderRadius: '12px', 
          marginBottom: '16px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          {coverImage ? (
            <img 
              src={coverImage} 
              alt={title} 
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} 
            />
          ) : (
            <div style={{ display: 'flex', gap: '8px', opacity: 0.5 }}>
              <div style={{ width: '30px', height: '30px', backgroundColor: '#B0A8B9', clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}></div>
              <div style={{ width: '30px', height: '30px', backgroundColor: '#B0A8B9', borderRadius: '4px' }}></div>
            </div>
          )}
        </div>

        <h4 style={{ 
          fontSize: '16px', 
          fontWeight: '600', 
          marginBottom: '8px', 
          color: '#111827', 
          whiteSpace: 'nowrap', 
          overflow: 'hidden', 
          textOverflow: 'ellipsis' 
        }} title={title}>
          {title}
        </h4>
      </div>

      <div>
        {rating > 0 ? (
          <>
            <div style={{ color: '#FFD700', marginBottom: '4px', fontSize: '14px', letterSpacing: '2px' }}>
              {renderStars(rating)}
            </div>
            <div style={{ fontSize: '12px', color: '#4B5563', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {platform} • {hoursPlayed} hrs
            </div>
          </>
        ) : (
          <>
            <div style={{ color: '#143910', marginBottom: '4px', fontSize: '12px', fontWeight: '600' }}>
              Not rated yet.
            </div>
            <div style={{ fontSize: '12px', color: '#4B5563', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {platform}
            </div>
          </>
        )}
      </div>
    </div>
  );
}