import React from 'react';
import PropTypes from 'prop-types';
import Form from 'react-bootstrap/Form';
import FormControl from 'react-bootstrap/FormControl';
import Row from 'react-bootstrap/Row';
import DebounceInput from 'react-debounce-input';

export const NumberOfClips = ({
  numberOfClips,
  setNumberOfClips,
}) => {
  let timeout = null;
  const handler = (e) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => setNumberOfClips(e), 500);
  };
  return (
    <Row>
      <Form>
        <label>Number of Clips</label>
        <FormControl
          as={DebounceInput}
          value={numberOfClips}
          onChange={handler}
        />
      </Form>
    </Row>
  );
}
NumberOfClips.propTypes = {
  numberOfClips: PropTypes.number.isRequired,
  setNumberOfClips: PropTypes.func.isRequired,
};
