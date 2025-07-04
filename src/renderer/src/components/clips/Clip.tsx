import { useState } from 'react';
import styles from './Clip.module.css';

interface ClipProps {
  clip: string;
  index: number;
}

export const Clip = ({ clip, index }: ClipProps): React.JSX.Element => {
  const [expandedMenu, setExpandedMenu] = useState<boolean>(false);

  const toggleMenu = () => {
    setExpandedMenu(!expandedMenu);
  };

  return (
    <li className={styles.clip}>
      <div className={styles.clipRow}>
        {/* Row number */}
        <div className={styles.rowNumber}>
          {index + 1}
        </div>
        
        {/* Content area */}
        <div className={styles.contentArea}>
          {clip}
        </div>
        
        {/* Settings button */}
        <div className={styles.settingsContainer}>
          <button
            onClick={toggleMenu}
            className={styles.settingsButton}
          >
            <svg 
              className={styles.settingsIcon}
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
          
          {/* Expandable menu */}
          {expandedMenu && (
            <div className={styles.expandedMenu}>
              <button className={styles.menuButton}>
                Copy
              </button>
              <button className={styles.menuButtonBorder}>
                Edit
              </button>
              <button className={styles.deleteButton}>
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
};
