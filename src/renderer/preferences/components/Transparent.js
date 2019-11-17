import React from 'react';
import PropTypes from 'prop-types';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import FormControl from 'react-bootstrap/FormControl';

export const Transparent = ({
  transparent,
  toggleTransparent,
  opacity,
  setOpacity,
}) => (
  <Row>
    <Form>
      <Form.Check
        type="switch"
        id="transparent"
        label="Enable Window Transparency"
        checked={transparent}
        onChange={toggleTransparent}
      />
      { transparent &&
        <FormControl
          type="range"
          min="0.1"
          max="1.0"
          step="0.1"
          value={opacity}
          onChange={setOpacity}
        />
      }
    </Form>
  </Row>
);
Transparent.propTypes = {
  transparent: PropTypes.bool.isRequired,
  toggleTransparent: PropTypes.func.isRequired,
  opacity: PropTypes.number.isRequired,
  setOpacity: PropTypes.func.isRequired,
};
