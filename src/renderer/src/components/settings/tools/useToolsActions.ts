import type { Dispatch, SetStateAction } from 'react';
import type { SearchTerm } from '../../../../../shared/types';
import { useToast } from '../../useToast';
import { errorText } from '../shell/errorText';
import type { FixActions } from './Fixes';
import type { Selection } from './ListPane';
import type { TermDraft } from './SearchTermEditor';
import type { TemplateDraft } from './TemplateEditor';
import type { ToolDraft } from './ToolEditor';
import type { ToolsData } from './useToolsData';
import type { ToolsItem } from './model';
import type { ToolsView } from './toolsView';

interface ToolsActionsOptions {
  data: ToolsData;
  selected: Selection | null;
  current: ToolsItem | undefined;
  navigate: (go: () => void) => void;
  setView: Dispatch<SetStateAction<ToolsView>>;
  setDirty: Dispatch<SetStateAction<boolean>>;
  setDeleting: Dispatch<SetStateAction<boolean>>;
}

export function useToolsActions({
  data,
  selected,
  current,
  navigate,
  setView,
  setDirty,
  setDeleting,
}: ToolsActionsOptions) {
  const toast = useToast();
  const { config } = data;
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
    const term = config.terms.find((candidate) => candidate.id === id) as SearchTerm;
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

  const remove = async () => {
    if (!selected || !current) return;
    try {
      if (selected.kind === 'term') await window.api.searchTermsDelete(selected.id);
      else if (selected.kind === 'tool') await window.api.quickToolsDelete(selected.id);
      else await window.api.templatesDelete(selected.id);
      toast('Deleted', current.name);
      setDeleting(false);
      setDirty(false);
      setView({ mode: 'overview' });
    } catch (error) {
      fail('Delete', error);
    }
  };

  return { fixes, pickColour, toggleTerm, saveTerm, saveTool, saveTemplate, remove };
}
