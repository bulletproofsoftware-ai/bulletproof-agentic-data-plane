import React, { useState, useCallback } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export function SearchBar({ onSearch, placeholder = 'Search by field, dataset, or pipeline...' }: SearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  }, [query, onSearch]);

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8 }}>
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1,
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: 6,
          padding: '8px 12px',
          color: '#e2e8f0',
          fontSize: 13,
          outline: 'none',
        }}
      />
      <button
        type="submit"
        style={{
          background: '#3B82F6',
          border: 'none',
          borderRadius: 6,
          padding: '8px 16px',
          color: '#fff',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Search
      </button>
    </form>
  );
}
