import React from 'react';
import PropTypes from 'prop-types';
import Form from 'react-bootstrap/Form';
import FormControl from 'react-bootstrap/FormControl';
import Row from 'react-bootstrap/Row';

export const NumberOfClips = ({
  numberOfClips,
  setNumberOfClips,
}) => (
  <Row>
    <Form>
      <label>Number of Clips</label>
      <FormControl
        value={numberOfClips}
        onChange={setNumberOfClips}
      />
    </Form>
  </Row>
);
NumberOfClips.propTypes = {
  numberOfClips: PropTypes.number.isRequired,
  setNumberOfClips: PropTypes.func.isRequired,
};
