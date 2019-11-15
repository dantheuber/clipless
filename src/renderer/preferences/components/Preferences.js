import React from 'react';
import PropTypes from 'prop-types';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import { AlwaysOnTop } from '../containers/AlwaysOnTop';

export const Preferences = ({
  closePreferences,
}) => (
  <Container className="main">
    <Row>
      <h3>Preferences</h3>
    </Row>
    <AlwaysOnTop />
    <Button onClick={closePreferences}>Done</Button>
  </Container>
);
Preferences.propTypes = {
  closePreferences: PropTypes.func.isRequired,
};
