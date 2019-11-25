import React from 'react';
import PropTypes from 'prop-types';
import { KeyCode, editor as mEditor } from 'monaco-editor';
import MonacoEditor from 'react-monaco-editor';
import Button from 'react-bootstrap/Button';
import InputGroup from 'react-bootstrap/InputGroup';
import DropdownButton from 'react-bootstrap/DropdownButton';
import Dropdown from 'react-bootstrap/Dropdown';
import { LANGUAGES, EDITOR_OPTIONS } from '../constants';

export const ClipEditor = ({
  clip,
  index,
  language,
  clipModified,
  selectEditorLanguage,
  returnToNormalView,
}) => {
  mEditor.onDidCreateEditor(editor => {
    editor.onKeyDown((e) => {
      if (e.ctrlKey && e.keyCode === KeyCode.KEY_S) {
        returnToNormalView();
      }
    });
  });
  const height = window.innerHeight - 40;
  return (
    <div>
      <InputGroup>
        <Button onClick={returnToNormalView} size="sm">
          Done
        </Button>
        <DropdownButton
          size="sm"
          drop="down"
          id="language-dropdown"
          variant="outline-secondary"
          title={language}
          id="dropdown-language"
        >
        { LANGUAGES.map(lang => (
          <Dropdown.Item
            key={lang}
            active={lang === language}
            onClick={() => selectEditorLanguage(lang)}
          >
            {lang}
          </Dropdown.Item>
        ))}
        </DropdownButton>
      </InputGroup>
      <MonacoEditor
        height={height}
        theme="vs-dark"
        language={language}
        options={EDITOR_OPTIONS}
        value={clip}
        onChange={e => clipModified(e, index)}
      />
    </div>
  );
};
ClipEditor.propTypes = {
  clip: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
  language: PropTypes.string.isRequired,
  clipModified: PropTypes.func.isRequired,
  selectEditorLanguage: PropTypes.func.isRequired,
  returnToNormalView: PropTypes.func.isRequired,
};