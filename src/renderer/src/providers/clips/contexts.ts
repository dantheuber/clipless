import { createContext, useContext } from 'react';
import type {
  ClipsActionsContextType,
  ClipsContextType,
  ClipsDataContextType,
  ClipsMetaContextType,
  ClipsPinsContextType,
  ClipsQuickLookContextType,
} from './types';

export const ClipsDataContext = createContext<ClipsDataContextType | null>(null);
export const ClipsActionsContext = createContext<ClipsActionsContextType | null>(null);
export const ClipsMetaContext = createContext<ClipsMetaContextType | null>(null);
export const ClipsPinsContext = createContext<ClipsPinsContextType | null>(null);
export const ClipsQuickLookContext = createContext<ClipsQuickLookContextType | null>(null);

export const useClipsData = (): ClipsDataContextType => {
  const context = useContext(ClipsDataContext);
  if (!context) throw new Error('useClipsData must be used within ClipsProvider');
  return context;
};

export const useClipsActions = (): ClipsActionsContextType => {
  const context = useContext(ClipsActionsContext);
  if (!context) throw new Error('useClipsActions must be used within ClipsProvider');
  return context;
};

export const useClipsMeta = (): ClipsMetaContextType => {
  const context = useContext(ClipsMetaContext);
  if (!context) throw new Error('useClipsMeta must be used within ClipsProvider');
  return context;
};

export const useClipsPins = (): ClipsPinsContextType => {
  const context = useContext(ClipsPinsContext);
  if (!context) throw new Error('useClipsPins must be used within ClipsProvider');
  return context;
};

export const useQuickLook = (): ClipsQuickLookContextType => {
  const context = useContext(ClipsQuickLookContext);
  if (!context) throw new Error('useQuickLook must be used within ClipsProvider');
  return context;
};

export const useClips = (): ClipsContextType => {
  const data = useClipsData();
  const actions = useClipsActions();
  const meta = useClipsMeta();
  return { ...data, ...actions, ...meta };
};
