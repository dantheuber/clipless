import { useClips } from '../../providers/clips';
import { useTheme } from '../../providers/theme';
import { Clip } from './Clip';
import classNames from 'classnames';
import styles from './Clips.module.css';

export const Clips = (): React.JSX.Element => {
  const { clips } = useClips();
  const { isLight } = useTheme();

  return (
    <div className={classNames(styles.clipsContainer, { [styles.light]: isLight })}>
      <ol className={styles.clipsList}>
        {clips.map((clip, index) => (
          <Clip key={index} clip={clip} index={index} />
        ))}
      </ol>
    </div>
  );
};