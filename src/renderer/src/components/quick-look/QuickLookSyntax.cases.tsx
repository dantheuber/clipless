import {
  cleanup,
  expect,
  it,
  QuickLook,
  render,
  screen,
  type QuickLookCaseContext,
} from './quickLookCaseHarness';

export function registerQuickLookSyntaxCases({ state, openOn }: QuickLookCaseContext) {
  it('colours code with Prism tokens and puts the chip inside the string token', () => {
    openOn('j');
    render(<QuickLook />);
    expect(screen.getByTestId('ql-header')).toHaveTextContent('json');
    const content = screen.getByTestId('ql-content');
    expect(content.querySelector('.tok-property')).not.toBeNull();
    const chip = content.querySelector('[data-key="ip|9.9.9.9"]') as HTMLElement;
    expect(chip.querySelector('.tok-string')).not.toBeNull();
    state.codeDetection = false;
    cleanup();
    render(<QuickLook />);
    expect(screen.getByTestId('ql-content').querySelector('.tok-property')).toBeNull();
  });
}
