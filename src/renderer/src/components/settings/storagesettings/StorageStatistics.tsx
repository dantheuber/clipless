import React from 'react';
import classNames from 'classnames';
import { useTheme } from '../../../providers/theme';
import type { StorageStats } from '../../../../../shared/types';
import styles from '../StorageSettings.module.css';

interface StorageStatisticsProps {
  stats: StorageStats;
}

export const StorageStatistics: React.FC<StorageStatisticsProps> = ({ stats }) => {
  const { isLight } = useTheme();

  return (
    <div className={styles.section}>
      <h3 className={classNames(styles.sectionTitle, { [styles.light]: isLight })}>
        Storage Statistics
      </h3>
      <div className={styles.statsGrid}>
        <div
          className={classNames(styles.statCard, styles.statCardBlue, {
            [styles.light]: isLight,
          })}
        >
          <div className={styles.statIconContainer}>
            <svg
              className={classNames(styles.statIcon, styles.statIconBlue, {
                [styles.light]: isLight,
              })}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div className={styles.statContent}>
            <div
              className={classNames(styles.statValue, styles.statValueBlue, {
                [styles.light]: isLight,
              })}
            >
              {stats.clipCount}
            </div>
            <div
              className={classNames(styles.statLabel, styles.statLabelBlue, {
                [styles.light]: isLight,
              })}
            >
              Total Clips
            </div>
          </div>
        </div>

        <div
          className={classNames(styles.statCard, styles.statCardGreen, {
            [styles.light]: isLight,
          })}
        >
          <div className={styles.statIconContainer}>
            <svg
              className={classNames(styles.statIcon, styles.statIconGreen, {
                [styles.light]: isLight,
              })}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <div className={styles.statContent}>
            <div
              className={classNames(styles.statValue, styles.statValueGreen, {
                [styles.light]: isLight,
              })}
            >
              {stats.lockedCount}
            </div>
            <div
              className={classNames(styles.statLabel, styles.statLabelGreen, {
                [styles.light]: isLight,
              })}
            >
              Locked
            </div>
          </div>
        </div>

        <div
          className={classNames(styles.statCard, styles.statCardPurple, {
            [styles.light]: isLight,
          })}
        >
          <div className={styles.statIconContainer}>
            <svg
              className={classNames(styles.statIcon, styles.statIconPurple, {
                [styles.light]: isLight,
              })}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
              />
            </svg>
          </div>
          <div className={styles.statContent}>
            <div
              className={classNames(styles.statValue, styles.statValuePurple, {
                [styles.light]: isLight,
              })}
            >
              {(stats.dataSize / 1024).toFixed(1)} KB
            </div>
            <div
              className={classNames(styles.statLabel, styles.statLabelPurple, {
                [styles.light]: isLight,
              })}
            >
              Storage Size
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
