import React, { useRef, useEffect } from 'react';
import { useClips } from '../providers/clips';
import { useTheme } from '../providers/theme';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classNames from 'classnames';
import styles from './SearchBar.module.css';

export const SearchBar: React.FC = () => {
  const { searchTerm, setSearchTerm, isSearchVisible, setIsSearchVisible } = useClips();
  const { isLight } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSearchVisible]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setSearchTerm('');
      setIsSearchVisible(false);
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    inputRef.current?.focus();
  };

  if (!isSearchVisible) return null;

  return (
    <div className={classNames(styles.searchBar, { [styles.light]: isLight })}>
      <FontAwesomeIcon icon="search" style={{ color: '#a0a0a0', fontSize: '0.85rem' }} />
      <input
        ref={inputRef}
        type="text"
        className={styles.searchInput}
        placeholder="Filter clips..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      {searchTerm && (
        <button className={styles.clearButton} onClick={handleClear} title="Clear search">
          <FontAwesomeIcon icon="times" />
        </button>
      )}
    </div>
  );
};
