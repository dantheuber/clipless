import classNames from 'classnames';
import { ClipItem } from '../../../providers/clips';
import { useTheme } from '../../../providers/theme';
import styles from './Clip.module.css';

interface BookmarkClipProps {
  clip: ClipItem;
}

export const BookmarkClip = ({ clip }: BookmarkClipProps) => {
  const { isLight } = useTheme();

  return (
    <div>
      <span className={classNames(styles.typeLabel, { [styles.light]: isLight })}>Bookmark:</span>
      <span>
        {clip.title || 'Untitled'} - {clip.url}
      </span>
    </div>
  );
};
