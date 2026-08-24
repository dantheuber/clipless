import React, { useRef, useEffect } from 'react';
import { useClipsData, useClipsMeta, useClipsPins, useQuickLook } from '../providers/clips';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classNames from 'classnames';
import { SEARCH_INPUT_ID } from './searchInput';
import styles from './SearchBar.module.css';

export const SearchBar: React.FC = () => {
  const { searchTerm, pinnedOnly, filteredClips, clips, imagesNotSearched, isFiltering } =
    useClipsData();
  const { setSearchTerm, setPinnedOnly, isSearchVisible, hideSearch } = useClipsMeta();
  const { pins } = useClipsPins();
  const { requestRowFocus } = useQuickLook();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSearchVisible]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (searchTerm) {
        setSearchTerm('');
      } else {
        hideSearch();
      }
    } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
      if (filteredClips.length > 0) {
        e.preventDefault();
        requestRowFocus(filteredClips[0].originalIndex);
      }
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    inputRef.current?.focus();
  };

  if (!isSearchVisible) return null;

  const total = clips.filter((clip) => clip.content.trim() !== '').length;
  const countLine = isFiltering
    ? `${filteredClips.length} of ${total}` +
      (imagesNotSearched > 0
        ? ` · ${imagesNotSearched} ${imagesNotSearched === 1 ? 'image' : 'images'} not searched`
        : '')
    : '';

  return (
    <div className={styles.searchBar} data-testid="search-bar">
      <FontAwesomeIcon icon="search" className={styles.icon} />
      <input
        ref={inputRef}
        id={SEARCH_INPUT_ID}
        type="text"
        className={styles.searchInput}
        placeholder="Filter clips"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-label="Filter clips"
      />
      {countLine && (
        <span className={styles.count} data-testid="search-count">
          {countLine}
        </span>
      )}
      <button
        type="button"
        className={classNames(styles.toggle, { [styles.on]: pinnedOnly })}
        onClick={() => setPinnedOnly((prev) => !prev)}
        disabled={pins.size === 0 && !pinnedOnly}
        aria-pressed={pinnedOnly}
        title={
          pins.size === 0 && !pinnedOnly
            ? 'Pin a value to filter by it'
            : 'Show only clips that contain a pinned value'
        }
      >
        pinned
      </button>
      {searchTerm && (
        <button
          type="button"
          className={styles.clearButton}
          onClick={handleClear}
          title="Clear search"
        >
          <FontAwesomeIcon icon="xmark" />
        </button>
      )}
    </div>
  );
};
