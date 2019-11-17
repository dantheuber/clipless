import React from 'react';
import PropTypes from 'prop-types';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';

export const EmptyLockedClips = ({
  emptyLockedClips,
  toggleEmptyLockedClips,
}) => (
  <Row>
    <Form>
      <Form.Check
        type="switch"
        id="empty-locked-clips"
        label="Allow emptying of locked clips"
        checked={emptyLockedClips}
        onChange={toggleEmptyLockedClips}
      />
    </Form>
  </Row>
);
EmptyLockedClips.propTypes = {
  emptyLockedClips: PropTypes.bool.isRequired,
  toggleEmptyLockedClips: PropTypes.func.isRequired,
};
