import React from 'react';
import PropTypes from 'prop-types';
import InputGroup from 'react-bootstrap/InputGroup';
import Button from 'react-bootstrap/Button';
import FormControl from 'react-bootstrap/FormControl';
import { ClipSettings } from '../containers/ClipSettings';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export const Clip = ({
  clip,
  index,
  clipModified,
  clipSelected,
}) => (
  <InputGroup size="sm">
    <InputGroup.Prepend className="clip-number">
      <Button variant="dark" onClick={() => clipSelected(index)}>{ index + 1}</Button>
    </InputGroup.Prepend>
    <FormControl
      value={clip}
      readOnly={index === 0}
      onChange={e => clipModified(e, index)}
    />
    <InputGroup.Append className="clip-settings">
      { index === 0 ? (
        <Button variant="dark" onClick={() => clipSelected(index)}>
          <FontAwesomeIcon icon="clipboard" />
        </Button>
      ) : <ClipSettings index={index} /> }
    </InputGroup.Append>
  </InputGroup>
);

Clip.propTypes = {
  clip: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
  clipModified: PropTypes.func.isRequired,
  clipSelected: PropTypes.func.isRequired,
};
