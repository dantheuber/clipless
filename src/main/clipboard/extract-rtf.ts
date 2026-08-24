import { CODE_PAGE_LABELS, SKIPPED_DESTINATIONS } from './rtf-constants';

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
  const out: string[] = []; // a hand-written tokenizer: the RTF parsers on npm are unmaintained
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
      if (rtf[i] === '\\' && rtf[i + 1] === '*') {
        state.skip = true; // {\*\dest ...} is a destination a reader may ignore: skip the whole group
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

      if (next === "'") {
        const hex = rtf.slice(i + 2, i + 4); // \'hh: one byte in the document code page
        i += 4;
        if (skipChars > 0) {
          skipChars--;
          continue;
        }
        if (!state.skip && /^[0-9a-fA-F]{2}$/.test(hex)) pendingBytes.push(parseInt(hex, 16));
        continue;
      }

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

      const match = /^\\([a-zA-Z]+)(-?\d+)? ?/.exec(rtf.slice(i, i + 40)); // control word: letters, optional signed number, optional one space delimiter
      if (!match) {
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
          if (param !== undefined && param > 0) i += param; // binary data follows; skip it byte for byte
          break;
        default:
          break; // formatting and every other control word carry no text
      }
      continue;
    }

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
