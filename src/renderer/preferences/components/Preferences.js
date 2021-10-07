import React from 'react';
import PropTypes from 'prop-types';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import { Navigation } from '../containers/Navigation';
import { CompileTemplates } from '../compile-templates';
import { QuickClips } from '../quick-clip-launch';
import { GeneralPreferences } from './GeneralPreferences';

export const Preferences = ({
  closePreferences,
  viewingQuickClips,
  viewingGeneralPrefs,
  viewingTemplates,
}) => (
  <Container fluid className="main">
    <Navigation />
    { viewingGeneralPrefs && <GeneralPreferences /> }
    { viewingTemplates && <CompileTemplates /> }
    { viewingQuickClips && <QuickClips />}
    <Button className="prefsCloseButton" variant="success" onClick={closePreferences}>Done</Button>
  </Container>
);
Preferences.propTypes = {
  closePreferences: PropTypes.func.isRequired,
  viewingQuickClips: PropTypes.bool.isRequired,
  viewingGeneralPrefs: PropTypes.bool.isRequired,
  viewingTemplates: PropTypes.bool.isRequired,
};
