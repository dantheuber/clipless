import React from 'react';
import PropTypes from 'prop-types';
import FormControl from 'react-bootstrap/FormControl';
import Button from 'react-bootstrap/Button';

export const MultiLineClipView = ({
  clip,
  index,
  clipModified,
  returnToNormalView,
}) => (
  <div>
    <Button onClick={returnToNormalView} float="right">Done</Button>
    <FormControl
      className="multiLineView"
      as="textarea"
      value={clip}
      onChange={e => clipModified(e, index)} 
    />
  </div>
);
MultiLineClipView.propTypes = {
  clip: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
  clipModified: PropTypes.func.isRequired,
  returnToNormalView: PropTypes.func.isRequired,
};