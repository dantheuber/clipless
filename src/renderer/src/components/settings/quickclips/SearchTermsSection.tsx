import React from 'react';
import classNames from 'classnames';
import { SearchTerm } from '../../../../../shared/types';
import { useTheme } from '../../../providers/theme';
import { InfoTooltip } from './InfoTooltip';
import { TLD_PATTERN } from '../../../utils/tlds';
import styles from '../QuickClipsManager.module.css';

// Built-in common patterns
const BUILTIN_PATTERNS = [
  {
    name: 'Email Address',
    pattern: '(?<email>[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})',
  },
  {
    name: 'IP Address',
    pattern:
      '(?<ipAddress>\\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\b)',
  },
  {
    name: 'Domain Name',
    pattern: `(?<domainName>\\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9])?\\.)+(${TLD_PATTERN})\\b)`,
  },
  {
    name: 'Phone Number',
    pattern:
      '(?<phoneNumber>\\b(?:\\+?1[-.]?)?\\(?([0-9]{3})\\)?[-.]?([0-9]{3})[-.]?([0-9]{4})\\b)',
  },
  {
    name: 'URL',
    pattern:
      '(?<url>https?:\\/\\/(?<domainName>[a-zA-Z0-9](?:[a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9])?)*)(?:\\/[^\\s]*)?)',
  },
  {
    name: 'MAC Address',
    pattern:
      '(?<macAddress>\\b[0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}\\b)',
  },
  {
    name: 'IPv6 Address',
    pattern:
      '(?<ipv6Address>\\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\\b|\\b::1\\b|\\b::ffff:[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\b)',
  },
  {
    name: 'GUID',
    pattern:
      '(?<guid>\\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\\b)',
  },
];

interface SearchTermsSectionProps {
  searchTerms: SearchTerm[];
  editingSearchTermId: string | null;
  editingSearchTermName: string;
  editingSearchTermPattern: string;
  expandedSearchTermId: string | null;
  onCreateSearchTerm: () => Promise<void>;
  onCreateFromBuiltin: (builtin: (typeof BUILTIN_PATTERNS)[0]) => Promise<void>;
  onSaveSearchTerm: () => Promise<void>;
  onCancelSearchTermEdit: () => void;
  onStartSearchTermEdit: (term: SearchTerm) => void;
  onDeleteSearchTerm: (id: string) => void;
  onEditingSearchTermNameChange: (name: string) => void;
  onEditingSearchTermPatternChange: (pattern: string) => void;
  onExpandedSearchTermIdChange: (id: string | null) => void;
}

export function SearchTermsSection({
  searchTerms,
  editingSearchTermId,
  editingSearchTermName,
  editingSearchTermPattern,
  expandedSearchTermId,
  onCreateSearchTerm,
  onCreateFromBuiltin,
  onSaveSearchTerm,
  onCancelSearchTermEdit,
  onStartSearchTermEdit,
  onDeleteSearchTerm,
  onEditingSearchTermNameChange,
  onEditingSearchTermPatternChange,
  onExpandedSearchTermIdChange,
}: SearchTermsSectionProps): React.JSX.Element {
  const { isLight } = useTheme();

  const extractCaptureGroups = (pattern: string): string[] => {
    const matches = pattern.match(/\(\?<(\w+)>/g);
    if (!matches) return [];

    return matches
      .map((match) => {
        const groupName = match.match(/\(\?<(\w+)>/)?.[1];
        return groupName || '';
      })
      .filter(Boolean);
  };

  return (
    <div className={styles.tabContent}>
      <div className={styles.headerWithInfo}>
        <div className={styles.headerActions}>
          <select
            className={classNames(styles.builtinSelect, { [styles.light]: isLight })}
            onChange={(e) => {
              const index = parseInt(e.target.value);
              if (!isNaN(index)) {
                onCreateFromBuiltin(BUILTIN_PATTERNS[index]);
                e.target.value = '';
              }
            }}
            value=""
          >
            <option value="">Add Built-in Pattern...</option>
            {BUILTIN_PATTERNS.map((pattern, index) => (
              <option key={index} value={index}>
                {pattern.name}
              </option>
            ))}
          </select>
          <button
            className={classNames(styles.createButton, { [styles.light]: isLight })}
            onClick={onCreateSearchTerm}
          >
            Create Search Term
          </button>
        </div>
        <InfoTooltip
          content={
            <>
              Search terms use regular expressions with named capture groups to extract data from
              clipboard content. Use patterns like{' '}
              <code>
                (?&lt;email&gt;[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{'{'}2,{'}'})
              </code>
              to capture email addresses.
            </>
          }
        />
      </div>

      {searchTerms.length === 0 ? (
        <div className={classNames(styles.emptyState, { [styles.light]: isLight })}>
          <p>No search terms created yet. Create one or add a built-in pattern to get started.</p>
        </div>
      ) : (
        <div className={styles.itemsList}>
          {searchTerms.map((term) => (
            <div
              key={term.id}
              className={classNames(
                styles.itemCard,
                { [styles.light]: isLight },
                { [styles.editing]: editingSearchTermId === term.id },
                {
                  [styles.expanded]:
                    expandedSearchTermId === term.id || editingSearchTermId === term.id,
                }
              )}
            >
              {editingSearchTermId === term.id ? (
                <div className={styles.editForm}>
                  <input
                    type="text"
                    value={editingSearchTermName}
                    onChange={(e) => onEditingSearchTermNameChange(e.target.value)}
                    className={classNames(styles.nameInput, { [styles.light]: isLight })}
                    placeholder="Search term name"
                  />
                  <textarea
                    value={editingSearchTermPattern}
                    onChange={(e) => onEditingSearchTermPatternChange(e.target.value)}
                    className={classNames(styles.patternTextarea, { [styles.light]: isLight })}
                    placeholder="Regular expression with named capture groups"
                    rows={3}
                  />
                  <div className={styles.captureGroupsPreview}>
                    <span className={classNames(styles.label, { [styles.light]: isLight })}>
                      Capture Groups:
                    </span>
                    {extractCaptureGroups(editingSearchTermPattern).map((group) => (
                      <span key={group} className={styles.captureGroup}>
                        {group}
                      </span>
                    ))}
                  </div>
                  <div className={styles.editActions}>
                    <button
                      className={classNames(styles.saveButton, { [styles.light]: isLight })}
                      onClick={onSaveSearchTerm}
                    >
                      Save
                    </button>
                    <button
                      className={classNames(styles.cancelButton, { [styles.light]: isLight })}
                      onClick={onCancelSearchTermEdit}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.itemView}>
                  <div className={styles.itemHeader}>
                    <h4
                      className={classNames(styles.itemName, { [styles.light]: isLight })}
                      onClick={() =>
                        onExpandedSearchTermIdChange(
                          expandedSearchTermId === term.id ? null : term.id
                        )
                      }
                    >
                      {term.name}
                    </h4>
                    <div className={styles.itemActions}>
                      <button
                        className={classNames(styles.editButton, { [styles.light]: isLight })}
                        onClick={() => onStartSearchTermEdit(term)}
                      >
                        Edit
                      </button>
                      <button
                        className={classNames(styles.deleteButton, { [styles.light]: isLight })}
                        onClick={() => onDeleteSearchTerm(term.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {expandedSearchTermId === term.id && (
                    <div className={styles.itemDetails}>
                      <div className={styles.captureGroupsPreview}>
                        <span className={classNames(styles.label, { [styles.light]: isLight })}>
                          Capture Groups:
                        </span>
                        {extractCaptureGroups(term.pattern).map((group) => (
                          <span key={group} className={styles.captureGroup}>
                            {group}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
