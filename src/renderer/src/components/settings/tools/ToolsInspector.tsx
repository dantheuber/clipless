import type { BuiltinPattern } from '../../../../../shared/builtinPatterns';
import type { QuickTool, SearchTerm, Template } from '../../../../../shared/types';
import { Inspector } from './Inspector';
import { Overview } from './Overview';
import { Uses } from './Uses';
import { SampleText } from './SampleText';
import { StartFrom } from './StartFrom';
import { SearchTermEditor, type TermDraft } from './SearchTermEditor';
import { ToolEditor, type ToolDraft } from './ToolEditor';
import { TemplateEditor, type TemplateDraft } from './TemplateEditor';
import type { FixActions } from './Fixes';
import { KIND_LABEL, type ToolsItem } from './model';
import type { Selection } from './ListPane';
import type { ToolsView } from './toolsView';

interface ToolsInspectorProps {
  view: ToolsView;
  current: ToolsItem | undefined;
  selected: Selection | null;
  fixes: FixActions;
  navigate: (go: () => void) => void;
  setView: (view: ToolsView) => void;
  overview: () => void;
  goUses: (selection: Selection) => void;
  cancelEdit: () => void;
  saveTerm: (draft: TermDraft, id?: string) => void;
  saveTool: (draft: ToolDraft, id?: string) => void;
  saveTemplate: (draft: TemplateDraft, id?: string) => void;
  pickColour: (group: string, slot: number | null) => void;
  onDelete: () => void;
}

export function ToolsInspector({
  view,
  current,
  selected,
  fixes,
  navigate,
  setView,
  overview,
  goUses,
  cancelEdit,
  saveTerm,
  saveTool,
  saveTemplate,
  pickColour,
  onDelete,
}: ToolsInspectorProps) {
  if (view.mode === 'start') {
    const label = KIND_LABEL[view.kind];
    const close = () => navigate(() => setView({ mode: 'overview' }));
    if (view.kind === 'term' && view.draft === null) {
      return (
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
    }
    return (
      <Inspector title={`New ${label}`} onBack={overview} onClose={close}>
        <SampleText caption="Sample text" />
        {view.kind === 'term' && (
          <SearchTermEditor
            initial={view.draft as TermDraft}
            onSave={(draft) => saveTerm(draft)}
            onCancel={cancelEdit}
          />
        )}
        {view.kind === 'tool' && (
          <ToolEditor
            initial={{ name: '', url: 'https://' }}
            onSave={(draft) => saveTool(draft)}
            onCancel={cancelEdit}
          />
        )}
        {view.kind === 'template' && (
          <TemplateEditor
            initial={{ name: '', content: '' }}
            onSave={(draft) => saveTemplate(draft)}
            onCancel={cancelEdit}
          />
        )}
      </Inspector>
    );
  }

  if (view.mode === 'item' && current && selected) {
    const kind = selected.kind;
    return (
      <Inspector
        title={current.name}
        kind={KIND_LABEL[kind]}
        tab={view.tab}
        onTab={(tab) => navigate(() => setView({ ...view, tab }))}
        onBack={overview}
        onDelete={onDelete}
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
                onSave={(draft) => saveTerm(draft, current.id)}
                onCancel={cancelEdit}
              />
            )}
            {kind === 'tool' && (
              <ToolEditor
                key={current.id}
                initial={{ name: current.name, url: (current as QuickTool).url }}
                onSave={(draft) => saveTool(draft, current.id)}
                onCancel={cancelEdit}
              />
            )}
            {kind === 'template' && (
              <TemplateEditor
                key={current.id}
                initial={{ name: current.name, content: (current as Template).content }}
                onSave={(draft) => saveTemplate(draft, current.id)}
                onCancel={cancelEdit}
              />
            )}
          </>
        ) : (
          <Uses kind={kind} item={current} onGo={goUses} fixes={fixes} onPickColour={pickColour} />
        )}
      </Inspector>
    );
  }

  return (
    <Inspector
      title="Overview"
      kind="all groups"
      hint="select an item to edit it, or click a group to change its colour"
    >
      <Overview onGo={goUses} fixes={fixes} onPickColour={pickColour} />
    </Inspector>
  );
}
