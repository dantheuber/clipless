import classNames from 'classnames';
import { ClipItem } from '../../../providers/clips';
import { useTheme } from '../../../providers/theme';
import styles from './Clip.module.css';

interface HtmlClipProps {
  clip: ClipItem;
}

export const HtmlClip = ({ clip }: HtmlClipProps) => {
  const { isLight } = useTheme();
  return (
    <div>
      <span className={classNames(styles.typeLabel, { [styles.light]: isLight })}>HTML:</span>
      <span>{clip.content}</span>
    </div>
  );
};
