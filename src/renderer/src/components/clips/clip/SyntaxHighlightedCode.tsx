import { forwardRef } from 'react';
import classNames from 'classnames';
import SyntaxHighlighter from 'react-syntax-highlighter/dist/esm/prism-light';
import materialDark from 'react-syntax-highlighter/dist/esm/styles/prism/material-dark';
import materialLight from 'react-syntax-highlighter/dist/esm/styles/prism/material-light';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import java from 'react-syntax-highlighter/dist/esm/languages/prism/java';
import csharp from 'react-syntax-highlighter/dist/esm/languages/prism/csharp';
import cpp from 'react-syntax-highlighter/dist/esm/languages/prism/cpp';
import c from 'react-syntax-highlighter/dist/esm/languages/prism/c';
import markup from 'react-syntax-highlighter/dist/esm/languages/prism/markup';
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import powershell from 'react-syntax-highlighter/dist/esm/languages/prism/powershell';
import styles from './Clip.module.css';

SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('java', java);
SyntaxHighlighter.registerLanguage('csharp', csharp);
SyntaxHighlighter.registerLanguage('cpp', cpp);
SyntaxHighlighter.registerLanguage('c', c);
SyntaxHighlighter.registerLanguage('markup', markup);
SyntaxHighlighter.registerLanguage('css', css);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('sql', sql);
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('powershell', powershell);

interface SyntaxHighlightedCodeProps {
  editValue: string;
  syntaxLanguage: string;
  isLight: boolean;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export const SyntaxHighlightedCode = forwardRef<HTMLTextAreaElement, SyntaxHighlightedCodeProps>(
  ({ editValue, syntaxLanguage, isLight, onChange, onBlur, onKeyDown }, ref) => {
    const syntaxStyle = isLight ? materialLight : materialDark;
    const borderColor = isLight ? '#d0d0d0' : '#404040';
    const backgroundColor = isLight ? '#f8f8f8' : '#404040';

    return (
      <div className={styles.textEditorWrapper}>
        <div className={styles.syntaxHighlightContainer}>
          <SyntaxHighlighter
            language={syntaxLanguage}
            style={syntaxStyle}
            customStyle={{
              margin: 0,
              padding: 0,
              background: backgroundColor,
              fontSize: 'inherit',
              fontFamily: 'inherit',
              lineHeight: 'inherit',
              border: `1px solid ${borderColor}`,
              borderRadius: '0.25rem',
              overflow: 'hidden',
              boxSizing: 'border-box',
            }}
            codeTagProps={{
              style: {
                fontFamily: 'inherit',
                fontSize: 'inherit',
                lineHeight: 'inherit',
                background: 'transparent !important',
                padding: 0,
                margin: 0,
              },
            }}
            preTag="pre"
            PreTag={({ children, ...props }) => (
              <pre {...props} style={{ ...props.style, margin: 0, padding: '0.125rem 0.25rem' }}>
                {children}
              </pre>
            )}
          >
            {editValue}
          </SyntaxHighlighter>
          <textarea
            ref={ref}
            value={editValue}
            onChange={onChange}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            className={classNames(styles.textEditor, styles.syntaxOverlay, {
              [styles.light]: isLight,
            })}
            autoFocus
            rows={1}
            spellCheck={false}
            style={{
              resize: 'none',
              minHeight: '1.2em',
              color: 'transparent',
              caretColor: isLight ? '#000' : '#fff',
              lineHeight: 'inherit',
            }}
          />
        </div>
      </div>
    );
  }
);

SyntaxHighlightedCode.displayName = 'SyntaxHighlightedCode';

export default SyntaxHighlightedCode;
