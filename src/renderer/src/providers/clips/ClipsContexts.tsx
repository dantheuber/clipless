import type {
  ClipsActionsContextType,
  ClipsDataContextType,
  ClipsMetaContextType,
  ClipsPinsContextType,
  ClipsQuickLookContextType,
} from './types';
import {
  ClipsActionsContext,
  ClipsDataContext,
  ClipsMetaContext,
  ClipsPinsContext,
  ClipsQuickLookContext,
} from './contexts';

type ClipsContextsProps = {
  children: React.ReactNode;
  data: ClipsDataContextType;
  actions: ClipsActionsContextType;
  meta: ClipsMetaContextType;
  pins: ClipsPinsContextType;
  quickLook: ClipsQuickLookContextType;
};

export function ClipsContexts({
  children,
  data,
  actions,
  meta,
  pins,
  quickLook,
}: ClipsContextsProps) {
  return (
    <ClipsDataContext.Provider value={data}>
      <ClipsActionsContext.Provider value={actions}>
        <ClipsMetaContext.Provider value={meta}>
          <ClipsPinsContext.Provider value={pins}>
            <ClipsQuickLookContext.Provider value={quickLook}>
              {children}
            </ClipsQuickLookContext.Provider>
          </ClipsPinsContext.Provider>
        </ClipsMetaContext.Provider>
      </ClipsActionsContext.Provider>
    </ClipsDataContext.Provider>
  );
}
