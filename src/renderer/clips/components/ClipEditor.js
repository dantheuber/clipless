import React from 'react';
import PropTypes from 'prop-types';
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
}) => (
  <div>
    <InputGroup>
      <Button onClick={returnToNormalView}>
        Done
      </Button>
      <DropdownButton
        drop="down"
        flip
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
      height="272"
      theme="vs-dark"
      language={language}
      options={EDITOR_OPTIONS}
      value={clip}
      onChange={e => clipModified(e, index)}
    />
  </div>
);
ClipEditor.propTypes = {
  clip: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
  language: PropTypes.string.isRequired,
  clipModified: PropTypes.func.isRequired,
  selectEditorLanguage: PropTypes.func.isRequired,
  returnToNormalView: PropTypes.func.isRequired,
};