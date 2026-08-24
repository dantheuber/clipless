import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ConfirmDialog } from '../../ConfirmDialog';
import { Pane } from '../shell/Pane';
import { ToolsDataProvider } from './ToolsDataProvider';
import { useToolsData } from './useToolsData';
import { ListPane, type Selection } from './ListPane';
import { EditorHostContext, type EditorHost } from './editorHost';
import { KIND_LABEL, dependents, itemOf, type ToolsKind } from './model';
import { ToolsInspector } from './ToolsInspector';
import { useToolsActions } from './useToolsActions';
import type { ToolsView } from './toolsView';
import shell from '../shell/Shell.module.css';
import styles from './Tools.module.css';

const NEW_KEYS = new Set(['s', 'S']);

function ToolsBody() {
  const data = useToolsData();
  const { config } = data;
  const [view, setView] = useState<ToolsView>({ mode: 'overview' });
  const [dirty, setDirty] = useState(false);
  const saver = useRef<(() => void) | null>(null);
  const [pendingNav, setPendingNav] = useState<(() => void) | null>(null);
  const [deleting, setDeleting] = useState(false);

  const host = useMemo<EditorHost>(
    () => ({
      setDirty,
      setSaver: (fn) => {
        saver.current = fn;
      },
    }),
    []
  );

  const navigate = useCallback(
    (go: () => void) => {
      if (dirty) setPendingNav(() => go);
      else go();
    },
    [dirty]
  );

  const selected = view.mode === 'item' ? view.sel : null;
  const current = selected ? itemOf(config, selected.kind, selected.id) : undefined;

  useEffect(() => {
    if (view.mode === 'item' && !itemOf(config, view.sel.kind, view.sel.id)) {
      setView({ mode: 'overview' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.version]);

  const select = (sel: Selection, how: 'click' | 'keyboard') =>
    navigate(() => {
      const keepTab = view.mode === 'item' && view.sel.kind === sel.kind && view.sel.id === sel.id;
      setView({
        mode: 'item',
        sel,
        tab: how === 'keyboard' ? 'uses' : keepTab ? view.tab : 'edit',
      });
    });
  const goUses = (sel: Selection) => navigate(() => setView({ mode: 'item', sel, tab: 'uses' }));
  const overview = () => navigate(() => setView({ mode: 'overview' }));
  const startNew = (kind: ToolsKind) =>
    navigate(() => setView({ mode: 'start', kind, draft: null }));

  const { fixes, pickColour, toggleTerm, saveTerm, saveTool, saveTemplate, remove } =
    useToolsActions({ data, selected, current, navigate, setView, setDirty, setDeleting });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && NEW_KEYS.has(event.key)) {
        if (saver.current) {
          event.preventDefault();
          saver.current();
        }
        return;
      }
      if (event.key !== 'Escape' || pendingNav || deleting) return;
      if (view.mode === 'item' && view.tab === 'edit') {
        event.preventDefault();
        setDirty(false);
        setView({ ...view, tab: 'uses' });
      } else if (view.mode === 'item') {
        event.preventDefault();
        setView({ mode: 'overview' });
      } else if (view.mode === 'start') {
        event.preventDefault();
        setDirty(false);
        setView({ mode: 'overview' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, pendingNav, deleting]);

  const cancelEdit = () => {
    setDirty(false);
    if (view.mode === 'item') setView({ ...view, tab: 'uses' });
    else setView({ mode: 'overview' });
  };

  const deps = selected ? dependents(config, selected.kind, selected.id) : [];

  return (
    <EditorHostContext.Provider value={host}>
      <div className={styles.body}>
        <ListPane
          selected={selected}
          onSelect={select}
          onNew={startNew}
          onOpenEdit={() =>
            view.mode === 'item' && navigate(() => setView({ ...view, tab: 'edit' }))
          }
          onToggleTerm={toggleTerm}
          onDelete={() => selected && setDeleting(true)}
        />
        <ToolsInspector
          view={view}
          current={current}
          selected={selected}
          fixes={fixes}
          navigate={navigate}
          setView={setView}
          overview={overview}
          goUses={goUses}
          cancelEdit={cancelEdit}
          saveTerm={saveTerm}
          saveTool={saveTool}
          saveTemplate={saveTemplate}
          pickColour={pickColour}
          onDelete={() => setDeleting(true)}
        />
      </div>
      <ConfirmDialog
        isOpen={pendingNav !== null}
        type="warning"
        title="Discard changes?"
        message="The open editor has changes that are not saved. Nothing is stored until Save."
        confirmText="Discard"
        cancelText="Keep editing"
        onConfirm={() => {
          const go = pendingNav;
          setPendingNav(null);
          setDirty(false);
          go?.();
        }}
        onCancel={() => setPendingNav(null)}
      />
      <ConfirmDialog
        isOpen={deleting && current !== undefined}
        type="danger"
        title={`Delete ${current?.name ?? ''}?`}
        message={
          selected &&
          (deps.length > 0 ? (
            <p>
              <b>{deps.join(', ')}</b> {deps.length === 1 ? 'depends' : 'depend'} on a group this{' '}
              {KIND_LABEL[selected.kind]} produces and will lose it.
            </p>
          ) : (
            <p>Nothing depends on this {KIND_LABEL[selected.kind]}.</p>
          ))
        }
        confirmText="Delete"
        onConfirm={remove}
        onCancel={() => setDeleting(false)}
      />
    </EditorHostContext.Provider>
  );
}

function ToolsLoading() {
  const { loaded } = useToolsData();
  if (!loaded) return <div className={shell.loading}>Loading</div>;
  return <ToolsBody />;
}

export function Tools() {
  return (
    <ToolsDataProvider>
      <Pane title="Tools" scroll={false}>
        <ToolsLoading />
      </Pane>
    </ToolsDataProvider>
  );
}
