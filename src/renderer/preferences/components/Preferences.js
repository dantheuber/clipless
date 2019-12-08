import React from 'react';
import PropTypes from 'prop-types';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import { Navigation } from '../containers/Navigation';
import { CompileTemplates } from '../compile-templates';
import { GeneralPreferences } from './GeneralPreferences';

export const Preferences = ({
  closePreferences,
  viewingGeneralPrefs,
  viewingTemplates,
}) => (
  <Container className="main">
    <Navigation />
    { viewingGeneralPrefs && <GeneralPreferences /> }
    { viewingTemplates && <CompileTemplates /> }
    <Button onClick={closePreferences}>Done</Button>
  </Container>
);
Preferences.propTypes = {
  closePreferences: PropTypes.func.isRequired,
  viewingGeneralPrefs: PropTypes.bool.isRequired,
  viewingTemplates: PropTypes.bool.isRequired,
};
