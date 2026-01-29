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

const SAMPLE_TEXT =
  'The quick brown fox jumps over the lazy dog. Hello world! Test 123 abc xyz.';

function validatePattern(pattern: string): string | null {
  if (!pattern.trim()) {
    return 'Pattern cannot be empty.';
  }

  try {
    const regex = new RegExp(pattern, 'g');

    // Check 1: matches empty string
    if (regex.test('')) {
      return 'This pattern matches empty strings and will match everything.';
    }

    // Check 2: excessive matches on sample text
    regex.lastIndex = 0;
    const matches = SAMPLE_TEXT.match(regex);
    if (matches && matches.length > 20) {
      return `This pattern produces too many matches (${matches.length} on a short sample). It will likely match all clipboard content.`;
    }

    // Check 3: no named capture groups
    const hasNamedGroup = /\(\?<\w+>/.test(pattern);
    if (!hasNamedGroup) {
      return 'Pattern must contain at least one named capture group, e.g. (?<value>...).';
    }

    // Check 4: reserved capture group names (c1, c2, etc.)
    const groupNameRegex = /\(\?<(\w+)>/g;
    let groupMatch;
    while ((groupMatch = groupNameRegex.exec(pattern)) !== null) {
      if (/^c\d+$/.test(groupMatch[1])) {
        return `Capture group name "${groupMatch[1]}" is reserved. Names like c1, c2, etc. conflict with positional template tokens.`;
      }
    }

    return null;
  } catch {
    return 'Invalid regular expression.';
  }
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
                  {(() => {
                    const validationError = validatePattern(editingSearchTermPattern);
                    return (
                      <>
                        {validationError && (
                          <div className={styles.patternValidationError}>{validationError}</div>
                        )}
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
                            disabled={!!validationError}
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
                      </>
                    );
                  })()}
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
