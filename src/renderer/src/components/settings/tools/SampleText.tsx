import { useToolsData } from './useToolsData';
import w from '../shell/widgets.module.css';
import styles from './Tools.module.css';

export function SampleText({
  caption = 'Sample text, drives every preview',
}: {
  caption?: string;
}) {
  const data = useToolsData();
  return (
    <div className={styles.sample} data-testid="sample">
      <div className={styles.sampleCap}>
        <span>{caption}</span>
        {data.sampleIsClip && <span className={w.dim}>(the newest clip)</span>}
        <span className={w.sp} />
        {!data.sampleIsClip && (
          <button type="button" className={w.link} onClick={data.resetSample}>
            reset
          </button>
        )}
      </div>
      <textarea
        className={styles.sampleText}
        value={data.sample}
        spellCheck={false}
        aria-label="Sample text"
        onChange={(e) => data.setSample(e.target.value)}
        onBlur={data.saveSample}
        data-testid="sample-text"
      />
    </div>
  );
}
