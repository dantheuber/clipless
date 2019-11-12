import React from 'react';
import PropTypes from 'prop-types';
import Button from 'react-bootstrap/Button';
import MonacoEditor from 'react-monaco-editor';

let lang = "plaintext";
const options = {
  minimap: {
    enabled: false,
  },
  lineNumbersMinChars: 4,
};

export const ClipEditor = ({
  clip,
  index,
  clipModified,
  returnToNormalView,
}) => (
  <div>
    <Button
      float="right"
      variant="link"
      onClick={returnToNormalView}
    >
      Done
    </Button>
    <MonacoEditor
      height="272"
      theme="vs-dark"
      language={lang}
      options={options}
      value={clip}
      onChange={e => clipModified(e, index)}
    />
  </div>
);
ClipEditor.propTypes = {
  clip: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
  clipModified: PropTypes.func.isRequired,
  returnToNormalView: PropTypes.func.isRequired,
};