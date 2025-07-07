import React from 'react';
import classNames from 'classnames';
import { PatternMatch } from '../../../../../shared/types';
import { useTheme } from '../../../providers/theme';
import { InfoTooltip } from './InfoTooltip';
import styles from '../QuickClipsManager.module.css';

interface TestPatternsSectionProps {
  testText: string;
  testResults: PatternMatch[];
  onTestTextChange: (text: string) => void;
  onTestPattern: () => Promise<void>;
}

export function TestPatternsSection({
  testText,
  testResults,
  onTestTextChange,
  onTestPattern,
}: TestPatternsSectionProps): React.JSX.Element {
  const { isLight } = useTheme();

  return (
    <div className={styles.tabContent}>
      <div className={styles.headerWithInfo}>
        <button
          className={classNames(styles.testButton, { [styles.light]: isLight })}
          onClick={onTestPattern}
          disabled={!testText.trim()}
        >
          Test Patterns
        </button>
        <InfoTooltip
          content={
            <>Test your search patterns against sample text to see what data would be extracted.</>
          }
        />
      </div>

      <div className={styles.testArea}>
        <textarea
          value={testText}
          onChange={(e) => onTestTextChange(e.target.value)}
          className={classNames(styles.testTextarea, { [styles.light]: isLight })}
          placeholder="Enter text to test against your search patterns..."
          rows={6}
        />

        {testResults.length > 0 && (
          <div className={styles.testResults}>
            <h4 className={classNames(styles.resultsTitle, { [styles.light]: isLight })}>
              Test Results
            </h4>
            {testResults.map((result, index) => (
              <div
                key={index}
                className={classNames(styles.testResult, { [styles.light]: isLight })}
              >
                <div className={styles.resultHeader}>
                  <strong>{result.searchTermName}</strong>
                </div>
                <div className={styles.resultCaptures}>
                  {Object.entries(result.captures).map(([groupName, value]) => (
                    <div key={groupName} className={styles.resultCapture}>
                      <span className={styles.captureGroupName}>{groupName}:</span>
                      <span className={styles.captureValue}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
