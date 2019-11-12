import React from 'react';
import PropTypes from 'prop-types';
// import FormControl from 'react-bootstrap/FormControl';
import Button from 'react-bootstrap/Button';
import MonacoEditor from 'react-monaco-editor';

let lang = "plaintext";
const options = {
  minimap: {
    enabled: false,
  },
  lineNumbersMinChars: 4,
};

export const MultiLineClipView = ({
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
      // width="340"
      theme="vs-dark"
      language={lang}
      options={options}
      value={clip}
      onChange={e => clipModified(e, index)}
      />
    {/* <FormControl
      className="multiLineView"
      as="textarea"
      value={clip}
      onChange={e => clipModified(e, index)} 
    /> */}
  </div>
);
MultiLineClipView.propTypes = {
  clip: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
  clipModified: PropTypes.func.isRequired,
  returnToNormalView: PropTypes.func.isRequired,
};