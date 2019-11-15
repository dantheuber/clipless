import React from 'react';
import PropTypes from 'prop-types';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';

export const AlwaysOnTop = ({
  alwaysOnTop,
  toggleAlwaysOnTop,
}) => (
  <Row>
    <Form>
      <Form.Check
        type="switch"
        id="always-on-top"
        label="Always on Top"
        checked={alwaysOnTop}
        onChange={toggleAlwaysOnTop}
      />
    </Form>
  </Row>
);
AlwaysOnTop.propTypes = {
  alwaysOnTop: PropTypes.bool.isRequired,
  toggleAlwaysOnTop: PropTypes.func.isRequired,
};
