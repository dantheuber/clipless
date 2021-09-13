import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Row from 'react-bootstrap/Row';
import Container from 'react-bootstrap/Container';


export const QuickClips = ({
  searchTerms,
  tools,
}) => {
  const [something, setSomething] = useState(false);
  return (
    <Container>
      <Row>
        temp
      </Row>
    </Container>
  );
};

QuickClips.propTypes = {
  searchTerms: PropTypes.arrayOf(PropTypes.object).isRequired,
  tools: PropTypes.arrayOf(PropTypes.object).isRequired,
};
