import { useState } from 'react'
import styles from './Versions.module.css'

function Versions(): React.JSX.Element {
  const [versions] = useState(window.electron.process.versions)
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        <div className={`${styles.versionCard} ${isDark ? styles.dark : ''}`}>
          <svg className={`${styles.icon} ${styles.iconElectron} ${isDark ? styles.dark : ''}`} fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          <span className={`${styles.version} ${isDark ? styles.dark : ''}`}>v{versions.electron}</span>
          <span className={`${styles.label} ${isDark ? styles.dark : ''}`}>Electron</span>
        </div>
        
        <div className={`${styles.versionCard} ${isDark ? styles.dark : ''}`}>
          <svg className={`${styles.icon} ${styles.iconChrome} ${isDark ? styles.dark : ''}`} fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 22a10 10 0 110-20 10 10 0 010 20zm0-2a8 8 0 100-16 8 8 0 000 16zm-1-11v6h2v-6h-2zm0-2h2V5h-2v2z"/>
          </svg>
          <span className={`${styles.version} ${isDark ? styles.dark : ''}`}>v{versions.chrome}</span>
          <span className={`${styles.label} ${isDark ? styles.dark : ''}`}>Chromium</span>
        </div>
        
        <div className={`${styles.versionCard} ${isDark ? styles.dark : ''}`}>
          <svg className={`${styles.icon} ${styles.iconNode} ${isDark ? styles.dark : ''}`} fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <span className={`${styles.version} ${isDark ? styles.dark : ''}`}>v{versions.node}</span>
          <span className={`${styles.label} ${isDark ? styles.dark : ''}`}>Node.js</span>
        </div>
      </div>
      
      <div className={`${styles.footer} ${isDark ? styles.dark : ''}`}>
        These versions are provided by the Electron runtime environment
      </div>
    </div>
  )
}

export default Versions
