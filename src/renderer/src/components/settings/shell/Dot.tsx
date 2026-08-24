import classNames from 'classnames';
import w from './widgets.module.css';

export type DotKind = 'ok' | 'no' | 'orph' | 'off' | 'clip' | 'busy';

const CLASS: Record<DotKind, string> = {
  ok: w.dotOk,
  no: w.dotNo,
  orph: w.dotOrph,
  off: w.dotOff,
  clip: w.dotClip,
  busy: w.dotBusy,
};

export function Dot({
  kind,
  title,
  className,
}: {
  kind: DotKind;
  title?: string;
  className?: string;
}) {
  return (
    <span
      className={classNames(w.dot, CLASS[kind], className)}
      title={title}
      data-dot={kind}
      aria-hidden="true"
    />
  );
}
