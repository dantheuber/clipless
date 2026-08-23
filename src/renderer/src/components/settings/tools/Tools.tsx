import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { QuickTool, SearchTerm, Template } from '../../../../../shared/types';
import type { BuiltinPattern } from '../../../../../shared/builtinPatterns';
import { ConfirmDialog } from '../../ConfirmDialog';
import { useToast } from '../../Toast';
import { Pane } from '../shell/Pane';
import { ToolsDataProvider } from './ToolsDataProvider';
import { useToolsData } from './useToolsData';
import { ListPane, type Selection } from './ListPane';
import { Inspector } from './Inspector';
import { Overview } from './Overview';
import { Uses } from './Uses';
import { SampleText } from './SampleText';
import { StartFrom } from './StartFrom';
import { SearchTermEditor, type TermDraft } from './SearchTermEditor';
import { ToolEditor, type ToolDraft } from './ToolEditor';
import { TemplateEditor, type TemplateDraft } from './TemplateEditor';
import { EditorHostContext, type EditorHost } from './editorHost';
import type { FixActions } from './Fixes';
import { KIND_LABEL, dependents, itemOf, listDot, type ToolsItem, type ToolsKind } from './model';
import { errorText } from '../shell/errorText';
import shell from '../shell/Shell.module.css';
import styles from './Tools.module.css';

type View =
  | { mode: 'overview' }
  | { mode: 'item'; sel: Selection; tab: 'edit' | 'uses' }
  | { mode: 'start'; kind: ToolsKind; draft: TermDraft | null };

const NEW_KEYS = new Set(['s', 'S']);

function ToolsBody() {
  const toast = useToast();
  const data = useToolsData();
  const { config } = data;
  const [view, setView] = useState<View>({ mode: 'overview' });
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

  // Leaving a dirty edit asks once (spec 14.4)
  const navigate = useCallback(
    (go: () => void) => {
      if (dirty) setPendingNav(() => go);
      else go();
    },
    [dirty]
  );

  const selected = view.mode === 'item' ? view.sel : null;
  const current = selected ? itemOf(config, selected.kind, selected.id) : undefined;

  // After a reload, a selected item that is gone (deleted elsewhere, replaced by an import)
  // drops back to the overview. A just-saved item is selected before the reload that
  // carries it lands, so the check runs on the reload, never on the selection.
  useEffect(() => {
    if (view.mode === 'item' && !itemOf(config, view.sel.kind, view.sel.id)) {
      setView({ mode: 'overview' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.version]);

  const select = (sel: Selection, how: 'click' | 'keyboard') =>
    navigate(() => {
      // Walking the list follows on Uses, never on Edit, so it cannot discard an edit
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

  const fail = (what: string, error: unknown) => toast(`${what} failed`, errorText(error));

  const fixes: FixActions = {
    enableTerm: async (term) => {
      try {
        await window.api.searchTermsUpdate(term.id, { enabled: true });
        toast('Enabled', term.name);
      } catch (error) {
        fail('Enable', error);
      }
    },
    addLibrary: async (entry) => {
      try {
        const created = await window.api.searchTermsCreate(entry.name, entry.pattern);
        toast(
          'Added',
          `${entry.name}. It is a normal search term now: edit it, turn it off, delete it.`
        );
        setView({ mode: 'item', sel: { kind: 'term', id: created.id }, tab: 'uses' });
      } catch (error) {
        fail('Add', error);
      }
    },
    newTermFor: (group) =>
      navigate(() =>
        setView({
          mode: 'start',
          kind: 'term',
          draft: { name: '', pattern: `(?<${group}>)`, enabled: true },
        })
      ),
  };

  const pickColour = async (group: string, slot: number | null) => {
    const next = { ...data.groupColours };
    if (slot === null) delete next[group];
    else next[group] = slot;
    try {
      await window.api.groupColoursSet(next);
    } catch (error) {
      fail('Colour change', error);
    }
  };

  const toggleTerm = async (id: string) => {
    const term = config.terms.find((t) => t.id === id) as SearchTerm;
    try {
      await window.api.searchTermsUpdate(id, { enabled: !term.enabled });
      toast(term.name, term.enabled ? 'disabled, kept in the list' : 'enabled');
    } catch (error) {
      fail('Toggle', error);
    }
  };

  const saveTerm = async (draft: TermDraft, id?: string) => {
    try {
      if (id) {
        await window.api.searchTermsUpdate(id, draft);
        setView({ mode: 'item', sel: { kind: 'term', id }, tab: 'uses' });
      } else {
        const created = await window.api.searchTermsCreate(draft.name, draft.pattern);
        if (!draft.enabled) await window.api.searchTermsUpdate(created.id, { enabled: false });
        setView({ mode: 'item', sel: { kind: 'term', id: created.id }, tab: 'uses' });
      }
      setDirty(false);
      toast('Saved', draft.name);
    } catch (error) {
      fail('Save', error);
    }
  };

  const saveTool = async (draft: ToolDraft, id?: string) => {
    try {
      if (id) {
        await window.api.quickToolsUpdate(id, draft);
        setView({ mode: 'item', sel: { kind: 'tool', id }, tab: 'uses' });
      } else {
        const created = await window.api.quickToolsCreate(draft.name, draft.url, []);
        setView({ mode: 'item', sel: { kind: 'tool', id: created.id }, tab: 'uses' });
      }
      setDirty(false);
      toast('Saved', draft.name);
    } catch (error) {
      fail('Save', error);
    }
  };

  const saveTemplate = async (draft: TemplateDraft, id?: string) => {
    try {
      if (id) {
        await window.api.templatesUpdate(id, draft);
        setView({ mode: 'item', sel: { kind: 'template', id }, tab: 'uses' });
      } else {
        const created = await window.api.templatesCreate(draft.name, draft.content);
        setView({ mode: 'item', sel: { kind: 'template', id: created.id }, tab: 'uses' });
      }
      setDirty(false);
      toast('Saved', draft.name);
    } catch (error) {
      fail('Save', error);
    }
  };

  // Only reachable from the delete dialog, which needs a selected, present item
  const remove = async () => {
    const sel = selected as Selection;
    const item = current as ToolsItem;
    try {
      if (sel.kind === 'term') await window.api.searchTermsDelete(sel.id);
      else if (sel.kind === 'tool') await window.api.quickToolsDelete(sel.id);
      else await window.api.templatesDelete(sel.id);
      toast('Deleted', item.name);
      setDeleting(false);
      setDirty(false);
      setView({ mode: 'overview' });
    } catch (error) {
      fail('Delete', error);
    }
  };

  // Esc: cancel an edit back to Uses, then back to the overview; Ctrl+S saves (spec 14.5)
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

  let inspector: React.ReactNode;
  if (view.mode === 'start') {
    const label = KIND_LABEL[view.kind];
    const close = () => navigate(() => setView({ mode: 'overview' }));
    if (view.kind === 'term' && view.draft === null) {
      inspector = (
        <Inspector title="New search term" onBack={overview} onClose={close}>
          <StartFrom
            onPick={(entry: BuiltinPattern | null) =>
              setView({
                mode: 'start',
                kind: 'term',
                draft: entry
                  ? { name: entry.name, pattern: entry.pattern, enabled: true }
                  : { name: '', pattern: '', enabled: true },
              })
            }
            onExisting={async (existing, disabled) => {
              if (disabled) await fixes.enableTerm(existing);
              setView({ mode: 'item', sel: { kind: 'term', id: existing.id }, tab: 'uses' });
            }}
          />
        </Inspector>
      );
    } else {
      inspector = (
        <Inspector title={`New ${label}`} onBack={overview} onClose={close}>
          <SampleText caption="Sample text" />
          {view.kind === 'term' && (
            <SearchTermEditor
              initial={view.draft as TermDraft}
              onSave={(d) => saveTerm(d)}
              onCancel={cancelEdit}
            />
          )}
          {view.kind === 'tool' && (
            <ToolEditor
              initial={{ name: '', url: 'https://' }}
              onSave={(d) => saveTool(d)}
              onCancel={cancelEdit}
            />
          )}
          {view.kind === 'template' && (
            <TemplateEditor
              initial={{ name: '', content: '' }}
              onSave={(d) => saveTemplate(d)}
              onCancel={cancelEdit}
            />
          )}
        </Inspector>
      );
    }
  } else if (view.mode === 'item' && current && selected) {
    const kind = selected.kind;
    inspector = (
      <Inspector
        title={current.name}
        kind={KIND_LABEL[kind]}
        tab={view.tab}
        onTab={(tab) => navigate(() => setView({ ...view, tab }))}
        onBack={overview}
        onDelete={() => setDeleting(true)}
      >
        {view.tab === 'edit' ? (
          <>
            <SampleText caption="Sample text" />
            {kind === 'term' && (
              <SearchTermEditor
                key={current.id}
                id={current.id}
                initial={{
                  name: current.name,
                  pattern: (current as SearchTerm).pattern,
                  enabled: (current as SearchTerm).enabled,
                }}
                onSave={(d) => saveTerm(d, current.id)}
                onCancel={cancelEdit}
              />
            )}
            {kind === 'tool' && (
              <ToolEditor
                key={current.id}
                initial={{ name: current.name, url: (current as QuickTool).url }}
                onSave={(d) => saveTool(d, current.id)}
                onCancel={cancelEdit}
              />
            )}
            {kind === 'template' && (
              <TemplateEditor
                key={current.id}
                initial={{ name: current.name, content: (current as Template).content }}
                onSave={(d) => saveTemplate(d, current.id)}
                onCancel={cancelEdit}
              />
            )}
          </>
        ) : (
          <Uses kind={kind} item={current} onGo={goUses} fixes={fixes} onPickColour={pickColour} />
        )}
      </Inspector>
    );
  } else {
    inspector = (
      <Inspector
        title="Overview"
        kind="all groups"
        hint="select an item to edit it, or click a group to change its colour"
      >
        <Overview onGo={goUses} fixes={fixes} onPickColour={pickColour} />
      </Inspector>
    );
  }

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
        {inspector}
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

/**
 * Settings > Tools (spec 14): a list pane and an inspector. No sub-tabs, no Test Patterns
 * tab, no separate template manager.
 */
export function Tools() {
  return (
    <ToolsDataProvider>
      <Pane title="Tools" scroll={false}>
        <ToolsLoading />
      </Pane>
    </ToolsDataProvider>
  );
}

// listDot is re-exported for tests that assert the list's dots through the tab
export { listDot };
