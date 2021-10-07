import React from 'react';
import PropTypes from 'prop-types';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import DebounceInput from 'react-debounce-input';
import { MAX_CLIPS } from '../constants';

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
      <Form onSubmit={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}>
        <Form.Label htmlFor="numberOfClips">
          Number of Clips
        </Form.Label>
        <Form.Control
          name="numberOfClips"
          as={DebounceInput}
          type="number"
          value={numberOfClips}
          onChange={handler}
          max={MAX_CLIPS}
        />
      </Form>
    </Row>
  );
}
NumberOfClips.propTypes = {
  numberOfClips: PropTypes.number.isRequired,
  setNumberOfClips: PropTypes.func.isRequired,
};
