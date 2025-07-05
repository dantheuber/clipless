import { useState } from 'react';
import { ClipItem, useClips } from '../../providers/clips';
import styles from './Clip.module.css';
import { ClipOptions } from './ClipOptions';

interface ClipProps {
  clip: ClipItem;
  index: number;
}

export const Clip = ({ clip, index }: ClipProps): React.JSX.Element => {
  const [expandedMenu, setExpandedMenu] = useState<boolean>(false);
  const { copyClipToClipboard } = useClips();

  const toggleMenu = () => {
    setExpandedMenu(!expandedMenu);
  };

  const handleRowNumberClick = async () => {
    await copyClipToClipboard(index);
  };

  const renderClipContent = () => {
    switch (clip.type) {
      case 'text':
        return <span>{clip.content}</span>;
      case 'html':
        return (
          <div>
            <span className={styles.typeLabel}>HTML:</span>
            <span>{clip.content}</span>
          </div>
        );
      case 'image':
        return (
          <div>
            <span className={styles.typeLabel}>Image:</span>
            <span>{clip.content}</span>
          </div>
        );
      case 'rtf':
        return (
          <div>
            <span className={styles.typeLabel}>RTF:</span>
            <span>{clip.content}</span>
          </div>
        );
      case 'bookmark':
        return (
          <div>
            <span className={styles.typeLabel}>Bookmark:</span>
            <span>{clip.title || 'Untitled'} - {clip.url}</span>
          </div>
        );
      default:
        return <span>{clip.content}</span>;
    }
  };

  return (
    <li className={styles.clip}>
      <div className={styles.clipRow}>
        {/* Row number */}
        <div 
          className={styles.rowNumber}
          onClick={handleRowNumberClick}
          title="Click to copy this clip to clipboard"
        >
          {index + 1}
        </div>
        
        {/* Content area */}
        <div className={styles.contentArea}>
          {renderClipContent()}
        </div>
        
        <ClipOptions index={index} />
      </div>
    </li>
  );
};
