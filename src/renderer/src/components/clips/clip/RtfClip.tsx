import classNames from 'classnames';
import { ClipItem } from '../../../providers/clips';
import { useTheme } from '../../../providers/theme';
import styles from './Clip.module.css';

interface RtfClipProps {
  clip: ClipItem;
}

export const RtfClip = ({ clip }: RtfClipProps) => {
  const { isLight } = useTheme();
  
  return (
    <div>
      <span className={classNames(styles.typeLabel, { [styles.light]: isLight })}>RTF:</span>
      <span>{clip.content}</span>
    </div>
  );
};
