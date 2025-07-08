import classNames from 'classnames';
import { useTheme } from '../../providers/theme';
import styles from './Versions.module.css';

function Versions(): React.JSX.Element {
  const appVersion = __APP_VERSION__;
  const { isLight } = useTheme();

  return (
    <div className={styles.container}>
      <div className={classNames(styles.versionFooter, { [styles.light]: isLight })}>
        <span className={classNames(styles.versionText, { [styles.light]: isLight })}>
          Clipless v{appVersion}
        </span>
      </div>
    </div>
  );
}

export default Versions;
