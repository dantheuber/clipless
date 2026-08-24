import { useCallback, useEffect, useState } from 'react';

export function useQuickLookDisplay(clipId: string | null) {
  const [litKey, setLitKey] = useState<string | null>(null);
  const [imageInfo, setImageInfo] = useState<{ width: number; height: number } | null>(null);
  const [removed, setRemoved] = useState<Record<string, number> | null>(null);
  const [sideOpen, setSideOpen] = useState(false);

  useEffect(() => {
    setImageInfo(null);
    setRemoved(null);
    setLitKey(null);
  }, [clipId]);

  const handleSanitized = useCallback((result: Record<string, number>) => setRemoved(result), []);
  const handleHover = useCallback((key: string | null) => setLitKey(key), []);

  return {
    litKey,
    imageInfo,
    removed,
    sideOpen,
    setImageInfo,
    setSideOpen,
    handleSanitized,
    handleHover,
  };
}
