import React from 'react';
import PropTypes from 'prop-types';

import Button from 'react-bootstrap/Button';
import InputGroup from 'react-bootstrap/InputGroup';
import DropdownButton from 'react-bootstrap/DropdownButton';
import Dropdown from 'react-bootstrap/Dropdown';
import { LANGUAGES } from '../constants';

export const ClipEditor = ({
  clip,
  index,
  language,
  clipModified,
  selectEditorLanguage,
  returnToNormalView,
}) => {
  const height = window.innerHeight - 40;
  return (
    <div>
      <InputGroup>
        <Button onClick={returnToNormalView} size="sm">
          Done
        </Button>
      </InputGroup>
      <textarea
        className={'clip-editor'}
        height={height}
        value={clip}
        onChange={e => clipModified(e, index)}
        rows={10}
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