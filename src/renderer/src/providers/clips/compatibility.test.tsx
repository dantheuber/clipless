import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ToastProvider } from '../../components/Toast';
import { LanguageDetectionProvider } from '../languageDetection';
import { ScanIndexProvider } from '../scan';
import { ClipsProvider, useClips, type ClipsContextType, type ClipType } from '.';

function CompatibilityConsumer() {
  const clips: ClipsContextType = useClips();
  const firstClipType: ClipType = clips.clips[0].type;
  return (
    <output data-testid="compatibility">
      {firstClipType}:{clips.maxClips}:{typeof clips.copyClipToClipboard}
    </output>
  );
}

afterEach(cleanup);

describe('clips provider compatibility exports', () => {
  it('merges data, actions, and metadata through useClips', () => {
    render(
      <ToastProvider>
        <LanguageDetectionProvider>
          <ScanIndexProvider>
            <ClipsProvider>
              <CompatibilityConsumer />
            </ClipsProvider>
          </ScanIndexProvider>
        </LanguageDetectionProvider>
      </ToastProvider>
    );

    expect(screen.getByTestId('compatibility')).toHaveTextContent('text:100:function');
  });
});
