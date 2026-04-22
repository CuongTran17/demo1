import { useState } from 'react';

/**
 * Display-only: <StarRating value={4.5} />
 * Interactive:  <StarRating value={rating} interactive onChange={setRating} />
 */
export default function StarRating({ value = 0, max = 5, size = 16, interactive = false, onChange }) {
  const [hovered, setHovered] = useState(0);

  const display = interactive ? (hovered || value) : value;

  return (
    <span
      className="star-rating"
      style={{ fontSize: size, lineHeight: 1 }}
      onMouseLeave={interactive ? () => setHovered(0) : undefined}
    >
      {Array.from({ length: max }, (_, i) => i + 1).map((star) => {
        const filled = star <= Math.round(display);
        return (
          <span
            key={star}
            className={`star ${filled ? 'star-filled' : 'star-empty'}`}
            style={interactive ? { cursor: 'pointer' } : undefined}
            onMouseEnter={interactive ? () => setHovered(star) : undefined}
            onClick={interactive && onChange ? () => onChange(star) : undefined}
          >
            {filled ? '★' : '☆'}
          </span>
        );
      })}
    </span>
  );
}
