import classNames from 'classnames'
import styles from './Versions.module.css'

function Versions(): React.JSX.Element {
  const appVersion = '1.0.0'
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches

  return (
    <div className={styles.container}>
      <div className={classNames(styles.versionFooter, { [styles.dark]: isDark })}>
        <span className={classNames(styles.versionText, { [styles.dark]: isDark })}>
          Clipless v{appVersion}
        </span>
      </div>
    </div>
  )
}

export default Versions
