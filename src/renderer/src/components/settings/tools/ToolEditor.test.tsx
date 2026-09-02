import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, cleanup } from '@testing-library/react';
import { ToolEditor } from './ToolEditor';
import { TemplateEditor } from './TemplateEditor';
import { defaultConfig, flush, installConfig, renderTools, SAMPLE, term } from './harness';

const onSave = vi.fn();
const onCancel = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  installConfig(defaultConfig(), { toolsSampleText: SAMPLE });
});

afterEach(cleanup);

describe('ToolEditor', () => {
  it('counts the tabs from the sample and lists every resolved URL with its values coloured', async () => {
    await renderTools(
      <ToolEditor
        initial={{ name: 'VirusTotal', url: 'https://vt.example/{ip}' }}
        onSave={onSave}
        onCancel={onCancel}
      />
    );
    expect(screen.getByTestId('tool-preview-caption')).toHaveTextContent(
      'Would open 2 tabs from the sample'
    );
    const editor = screen.getByTestId('tool-editor');
    expect(editor.querySelectorAll('[data-group="ip"]').length).toBeGreaterThanOrEqual(2);
    expect(editor).toHaveTextContent('https://vt.example/203.0.113.42');
    expect(editor).toHaveTextContent('https://vt.example/198.51.100.7');
    expect(screen.getByTestId('readiness')).toHaveTextContent('ready on the sample');
    expect(editor).toHaveTextContent('fed by');
    expect(editor).toHaveTextContent('IP address');
    fireEvent.change(screen.getByTestId('tool-url'), {
      target: { value: 'https://vt.example/{ip}/{ip|email}' },
    });
    expect(screen.getByTestId('readiness').querySelectorAll('[data-group]')).toHaveLength(2);
    expect(screen.getByTestId('tool-preview-caption')).toHaveTextContent('Would open 6 tabs');
  });

  it('flags an orphan token wavy and never ready before Save', async () => {
    await renderTools(
      <ToolEditor
        initial={{ name: 'Dir', url: 'https://people.example/{user}' }}
        onSave={onSave}
        onCancel={onCancel}
      />
    );
    expect(screen.getByTestId('readiness')).toHaveAttribute('data-level', 'never');
    expect(screen.getByTestId('readiness')).toHaveTextContent('never ready');
    expect(
      screen.getByTestId('tool-editor').querySelector('[data-orphan="true"]')
    ).toHaveTextContent('{user}');
    expect(screen.getByTestId('tool-preview-caption')).toHaveTextContent('Preview');
    expect(screen.getByTestId('tool-editor')).toHaveTextContent(
      'nothing would open from the sample'
    );
    expect(window.api.quickToolsCreate).not.toHaveBeenCalled();
  });

  it('says needs X, producer disabled, and sample lacks X, as two different lines', async () => {
    const config = defaultConfig();
    config.terms.push(term('t-hash', 'Hash', '(?<hash>\\b[a-f0-9]{64}\\b)'));
    installConfig(config, { toolsSampleText: SAMPLE });
    await renderTools(
      <ToolEditor
        initial={{ name: 'scan', url: 'https://urlscan.io/{domain}' }}
        onSave={onSave}
        onCancel={onCancel}
      />
    );
    expect(screen.getByTestId('readiness')).toHaveTextContent('needs domain, producer disabled');
    expect(screen.getByTestId('readiness')).toHaveAttribute('data-level', 'disabled');
    fireEvent.change(screen.getByTestId('tool-url'), { target: { value: 'https://x/{hash}' } });
    expect(screen.getByTestId('readiness')).toHaveTextContent('sample lacks hash');
    expect(screen.getByTestId('readiness')).toHaveAttribute('data-level', 'sample');
    fireEvent.change(screen.getByTestId('tool-url'), {
      target: { value: 'https://x/{ticket}/{email}' },
    });
    expect(screen.getByTestId('readiness')).toHaveTextContent('ready on the sample');
  });

  it('offers the picker with producers only, dimming disabled ones, and inserts at the caret', async () => {
    await renderTools(
      <ToolEditor initial={{ name: '', url: 'https://x/' }} onSave={onSave} onCancel={onCancel} />
    );
    const picker = screen.getByTestId('token-picker');
    const groups = Array.from(picker.querySelectorAll('[data-group]')).map((p) =>
      p.getAttribute('data-group')
    );
    expect(groups).toEqual(['ip', 'email', 'ticket', 'domain']);
    expect(groups).not.toContain('user');
    const url = screen.getByTestId('tool-url') as HTMLInputElement;
    url.setSelectionRange(url.value.length, url.value.length);
    fireEvent.click(picker.querySelector('[data-group="email"]') as HTMLElement);
    expect(url).toHaveValue('https://x/{email}');
    expect(screen.getByTestId('tool-preview-caption')).toHaveTextContent(
      'Would open 1 tab from the sample'
    );
    expect(screen.getByTestId('tool-save')).toBeDisabled();
    fireEvent.change(screen.getByTestId('tool-name'), { target: { value: ' HIBP ' } });
    fireEvent.click(screen.getByTestId('tool-save'));
    await flush();
    expect(onSave).toHaveBeenCalledWith({ name: 'HIBP', url: 'https://x/{email}' });
    fireEvent.click(screen.getByTestId('tool-cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('caps the preview and says how many more, and a URL with no tokens opens as it is', async () => {
    installConfig(defaultConfig(), {
      toolsSampleText: '1.1.1.1 2.2.2.2 3.3.3.3 4.4.4.4 5.5.5.5 a@b.co',
    });
    await renderTools(
      <ToolEditor
        initial={{ name: 'x', url: 'https://x/{ip}' }}
        onSave={onSave}
        onCancel={onCancel}
      />
    );
    expect(screen.getByTestId('tool-preview-caption')).toHaveTextContent('Would open 5 tabs');
    expect(screen.getByTestId('tool-editor')).toHaveTextContent('and 1 more');
    fireEvent.change(screen.getByTestId('tool-url'), {
      target: { value: 'https://plain.example/' },
    });
    expect(screen.getByTestId('readiness')).toHaveTextContent('no tokens');
    expect(screen.getByTestId('tool-preview-caption')).toHaveTextContent('Would open 1 tab');
  });

  it('warns beneath the URL field when the template has no http or https scheme and prefixes https:// on click', async () => {
    await renderTools(
      <ToolEditor
        initial={{ name: 'Lookup', url: 'example.com/{email}' }}
        onSave={onSave}
        onCancel={onCancel}
      />
    );
    const warning = screen.getByTestId('tool-url-scheme');
    expect(warning).toHaveTextContent('only http and https links can open');
    expect(screen.getByTestId('tool-preview-caption')).toHaveTextContent('Would open 1 tab');
    fireEvent.click(screen.getByTestId('tool-url-scheme-fix'));
    expect(screen.getByTestId('tool-url')).toHaveValue('https://example.com/{email}');
    expect(screen.queryByTestId('tool-url-scheme')).not.toBeInTheDocument();
    fireEvent.change(screen.getByTestId('tool-url'), { target: { value: 'ftp://x/{email}' } });
    expect(screen.getByTestId('tool-url-scheme')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('tool-url'), { target: { value: 'HTTP://x/{email}' } });
    expect(screen.queryByTestId('tool-url-scheme')).not.toBeInTheDocument();
    fireEvent.change(screen.getByTestId('tool-url'), { target: { value: '' } });
    expect(screen.queryByTestId('tool-url-scheme')).not.toBeInTheDocument();
  });

  it('the https:// fix strips leading whitespace and leaves the caret after the prefix', async () => {
    await renderTools(
      <ToolEditor
        initial={{ name: 'x', url: '  vt.example/{ip}' }}
        onSave={onSave}
        onCancel={onCancel}
      />
    );
    fireEvent.click(screen.getByTestId('tool-url-scheme-fix'));
    const url = screen.getByTestId('tool-url') as HTMLInputElement;
    expect(url).toHaveValue('https://vt.example/{ip}');
    expect(url.selectionStart).toBe('https://'.length);
    expect(document.activeElement).toBe(url);
  });

  it.each([
    ['ftp://vt.internal/{ip}', 'https://vt.internal/{ip}'],
    ['mailto:a@b.com', 'https://a@b.com'],
    ['file:///x/{ip}', 'https://x/{ip}'],
    ['https:/example.com/{ip}', 'https://example.com/{ip}'],
    ['localhost:3000/{ip}', 'https://localhost:3000/{ip}'],
  ])('the https:// fix replaces an existing scheme: %s', async (initial, expected) => {
    await renderTools(
      <ToolEditor initial={{ name: 'x', url: initial }} onSave={onSave} onCancel={onCancel} />
    );
    fireEvent.click(screen.getByTestId('tool-url-scheme-fix'));
    expect(screen.getByTestId('tool-url')).toHaveValue(expected);
    expect(screen.queryByTestId('tool-url-scheme')).not.toBeInTheDocument();
  });
});

describe('TemplateEditor', () => {
  it('shows the generated text with values coloured, offers the picker and saves', async () => {
    await renderTools(
      <TemplateEditor
        initial={{ name: 'Summary', content: 'Ticket {ticket} from {ip} ref {c1}' }}
        onSave={onSave}
        onCancel={onCancel}
      />
    );
    const editor = screen.getByTestId('template-editor');
    expect(editor).toHaveTextContent('Ticket INC-4821 from 203.0.113.42 ref {c1}');
    expect(editor.querySelector('[data-group="ticket"]')).toBeInTheDocument();
    expect(screen.getByTestId('readiness')).toHaveTextContent('ready on the sample');

    const text = screen.getByTestId('template-text') as HTMLTextAreaElement;
    text.setSelectionRange(text.value.length, text.value.length);
    fireEvent.click(
      screen.getByTestId('token-picker').querySelector('[data-group="email"]') as HTMLElement
    );
    expect(text).toHaveValue('Ticket {ticket} from {ip} ref {c1}{email}');
    fireEvent.click(screen.getByTestId('template-save'));
    await flush();
    expect(onSave).toHaveBeenCalledWith({
      name: 'Summary',
      content: 'Ticket {ticket} from {ip} ref {c1}{email}',
    });
    fireEvent.click(screen.getByTestId('template-cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('calls a positional-only template a clip template, and an empty one empty', async () => {
    await renderTools(
      <TemplateEditor
        initial={{ name: 'Intake', content: 'Customer: {c1}' }}
        onSave={onSave}
        onCancel={onCancel}
      />
    );
    expect(screen.getByTestId('readiness')).toHaveAttribute('data-level', 'clip');
    expect(screen.getByTestId('readiness')).toHaveTextContent('clip template');
    fireEvent.change(screen.getByTestId('template-text'), { target: { value: '' } });
    expect(screen.getByTestId('template-editor')).toHaveTextContent('empty');
    expect(screen.getByTestId('template-save')).toBeDisabled();
    fireEvent.change(screen.getByTestId('template-text'), { target: { value: '{user}' } });
    expect(screen.getByTestId('readiness')).toHaveTextContent('never ready');
  });
});
