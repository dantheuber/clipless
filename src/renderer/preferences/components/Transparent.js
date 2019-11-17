import React from 'react';
import PropTypes from 'prop-types';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';

export const Transparent = ({
  transparent,
  toggleTransparent,
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
    </Form>
  </Row>
);
Transparent.propTypes = {
  transparent: PropTypes.bool.isRequired,
  toggleTransparent: PropTypes.func.isRequired,
};
