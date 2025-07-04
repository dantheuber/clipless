import { useClips } from '../../providers/clips';
import { Clip } from './Clip';
import styles from './Clips.module.css';

export const Clips = (): React.JSX.Element => {
  const { clips } = useClips();

  return (
    <div className={styles.clipsContainer}>
      <ol className={styles.clipsList}>
        {clips.map((clip, index) => (
          <Clip key={index} clip={clip} index={index} />
        ))}
      </ol>
    </div>
  );
};