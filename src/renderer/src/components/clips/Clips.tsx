import { useClips } from '../../providers/clips';
import { useTheme } from '../../providers/theme';
import { Clip } from './clip';
import classNames from 'classnames';
import styles from './Clips.module.css';

export function Clips(): React.JSX.Element {
  const { clips, filteredClips, searchTerm } = useClips();
  const { isLight } = useTheme();

  const isFiltering = searchTerm.trim().length > 0;
  const showEmpty = isFiltering && filteredClips.length === 0;

  return (
    <div className={classNames(styles.clipsContainer, { [styles.light]: isLight })}>
      {showEmpty ? (
        <div className={classNames(styles.emptyState, { [styles.light]: isLight })}>
          No clips match &ldquo;{searchTerm}&rdquo;
        </div>
      ) : isFiltering ? (
        <ol className={styles.clipsList}>
          {filteredClips.map(({ clip, originalIndex }) => (
            <Clip key={originalIndex} clip={clip} index={originalIndex} />
          ))}
        </ol>
      ) : (
        <ol className={styles.clipsList}>
          {clips.map((clip, index) => (
            <Clip key={index} clip={clip} index={index} />
          ))}
        </ol>
      )}
    </div>
  );
}
