import { useState, useCallback } from 'react';

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  targetIndex?: number;
}

export function useContextMenu() {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
  });

  const openContextMenu = useCallback((event: React.MouseEvent, targetIndex?: number) => {
    event.preventDefault();
    event.stopPropagation();

    setContextMenu({
      isOpen: true,
      x: event.clientX,
      y: event.clientY,
      targetIndex,
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu({
      isOpen: false,
      x: 0,
      y: 0,
    });
  }, []);

  return {
    contextMenu,
    openContextMenu,
    closeContextMenu,
  };
}
