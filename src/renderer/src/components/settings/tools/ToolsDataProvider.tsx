import { ToolsDataContext, useToolsDataValue } from './useToolsData';

export function ToolsDataProvider({ children }: { children: React.ReactNode }) {
  const value = useToolsDataValue();
  return <ToolsDataContext.Provider value={value}>{children}</ToolsDataContext.Provider>;
}
