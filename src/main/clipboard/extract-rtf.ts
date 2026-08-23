/**
 * Plain text of an RTF clip. A hand-written tokenizer rather than an npm RTF library (the
 * ones on npm are unmaintained stream parsers). It tracks group depth, skips destination
 * groups, maps \par and \line to newline and \tab to tab, decodes \'hh through the
 * document code page and \uN to a code point honouring \ucN skip counts, and drops every
 * other control word. Same call sites as htmlToText.
 */

const SKIPPED_DESTINATIONS = new Set([
  'fonttbl',
  'colortbl',
  'stylesheet',
  'info',
  'pict',
  'header',
  'footer',
  'headerl',
  'headerr',
  'headerf',
  'footerl',
  'footerr',
  'footerf',
  'xmlnstbl',
  'listtable',
  'listoverridetable',
  'rsidtbl',
  'generator',
  'themedata',
  'colorschememapping',
  'latentstyles',
  'datastore',
  'fldinst',
  'object',
  'filetbl',
  'revtbl',
]);

const CODE_PAGE_LABELS: Record<number, string> = {
  437: 'ibm437',
  850: 'ibm850',
  866: 'ibm866',
  874: 'windows-874',
  932: 'shift_jis',
  936: 'gbk',
  949: 'euc-kr',
  950: 'big5',
  1250: 'windows-1250',
  1251: 'windows-1251',
  1252: 'windows-1252',
  1253: 'windows-1253',
  1254: 'windows-1254',
  1255: 'windows-1255',
  1256: 'windows-1256',
  1257: 'windows-1257',
  1258: 'windows-1258',
  10000: 'macintosh',
  65001: 'utf-8',
};

interface GroupState {
  skip: boolean;
  uc: number;
}

function decoderFor(codePage: number): TextDecoder {
  const label = CODE_PAGE_LABELS[codePage] ?? 'windows-1252';
  try {
    return new TextDecoder(label);
  } catch {
    return new TextDecoder('windows-1252');
  }
}

export function rtfToText(rtf: string): string {
  const out: string[] = [];
  const stack: GroupState[] = [];
  let state: GroupState = { skip: false, uc: 1 };
  let decoder = decoderFor(1252);
  let pendingBytes: number[] = [];
  let skipChars = 0; // characters still to skip after \uN

  const flushBytes = (): void => {
    if (pendingBytes.length === 0) return;
    out.push(decoder.decode(Uint8Array.from(pendingBytes)));
    pendingBytes = [];
  };

  const emit = (text: string): void => {
    flushBytes();
    if (!state.skip) out.push(text);
  };

  let i = 0;
  const length = rtf.length;

  while (i < length) {
    const ch = rtf[i];

    if (ch === '{') {
      flushBytes();
      stack.push(state);
      state = { ...state };
      i++;
      // {\*\dest ...} is a destination a reader may ignore: skip the whole group
      if (rtf[i] === '\\' && rtf[i + 1] === '*') {
        state.skip = true;
        i += 2;
      }
      continue;
    }

    if (ch === '}') {
      flushBytes();
      state = stack.pop() ?? { skip: false, uc: 1 };
      i++;
      continue;
    }

    if (ch === '\\') {
      const next = rtf[i + 1];

      if (next === undefined) {
        i++;
        continue;
      }

      // \'hh: one byte in the document code page
      if (next === "'") {
        const hex = rtf.slice(i + 2, i + 4);
        i += 4;
        if (skipChars > 0) {
          skipChars--;
          continue;
        }
        if (!state.skip && /^[0-9a-fA-F]{2}$/.test(hex)) pendingBytes.push(parseInt(hex, 16));
        continue;
      }

      // Control symbols: escaped braces and backslash, non-breaking space and hyphen
      if (next === '{' || next === '}' || next === '\\') {
        emit(next);
        i += 2;
        continue;
      }
      if (next === '~') {
        emit('\u00a0');
        i += 2;
        continue;
      }
      if (next === '_') {
        emit('\u2011');
        i += 2;
        continue;
      }
      if (next === '\n' || next === '\r') {
        emit('\n');
        i += 2;
        continue;
      }

      // Control word: letters, optional signed number, optional one space delimiter
      const match = /^\\([a-zA-Z]+)(-?\d+)? ?/.exec(rtf.slice(i, i + 40));
      if (!match) {
        // Any other control symbol: drop it
        i += 2;
        continue;
      }
      const word = match[1];
      const param = match[2] === undefined ? undefined : parseInt(match[2], 10);
      i += match[0].length;

      if (SKIPPED_DESTINATIONS.has(word)) {
        flushBytes();
        state.skip = true;
        continue;
      }

      switch (word) {
        case 'par':
        case 'line':
        case 'sect':
        case 'page':
          emit('\n');
          break;
        case 'tab':
          emit('\t');
          break;
        case 'cell':
          emit('\t');
          break;
        case 'row':
          emit('\n');
          break;
        case 'emdash':
          emit('\u2014');
          break;
        case 'endash':
          emit('\u2013');
          break;
        case 'lquote':
          emit('\u2018');
          break;
        case 'rquote':
          emit('\u2019');
          break;
        case 'ldblquote':
          emit('\u201c');
          break;
        case 'rdblquote':
          emit('\u201d');
          break;
        case 'bullet':
          emit('\u2022');
          break;
        case 'ansicpg':
          if (param !== undefined) decoder = decoderFor(param);
          break;
        case 'uc':
          if (param !== undefined) state.uc = Math.max(0, param);
          break;
        case 'u':
          if (param !== undefined) {
            const codePoint = param < 0 ? param + 65536 : param;
            emit(String.fromCodePoint(codePoint));
            skipChars = state.uc;
          }
          break;
        case 'bin':
          // Binary data follows; skip it byte for byte
          if (param !== undefined && param > 0) i += param;
          break;
        default:
          // Formatting and every other control word carry no text
          break;
      }
      continue;
    }

    // Plain character
    if (ch === '\r' || ch === '\n') {
      i++;
      continue;
    }
    if (skipChars > 0) {
      skipChars--;
      i++;
      continue;
    }
    if (!state.skip) {
      flushBytes();
      out.push(ch);
    }
    i++;
  }

  flushBytes();

  return out
    .join('')
    .split('\n')
    .map((line) => line.replace(/[^\S\t]+/g, ' ').trim())
    .filter((line) => line.length > 0)
    .join('\n');
}
