import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Container from 'react-bootstrap/Container';

import { Terms } from '../containers/Terms';
import { Tools } from '../containers/Tools';

export const QuickClips = ({
  autoScan,
  toggleAutoScan,
}) => {
  const [viewTools, setViewTools] = useState(false);
  const [viewTerms, setViewTerms] = useState(false);

  return (
    <Container>
      <Form>
        <Form.Check
          type="switch"
          id="auto-scan"
          label="Auto Scan clipboard"
          checked={autoScan}
          onChange={toggleAutoScan}
        />
      </Form>
      <Row onClick={() => setViewTools(!viewTools)}>
        Tools
      </Row>
      { viewTools && <Tools /> }
      <Row onClick={() => setViewTerms(!viewTerms)}>
        Terms
      </Row>
      { viewTerms && <Terms /> }
    </Container>
  );
};

QuickClips.propTypes = {
  autoScan: PropTypes.bool.isRequired,
  toggleAutoScan: PropTypes.func.isRequired,
};
