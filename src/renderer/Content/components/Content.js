import React from 'react';
import PropTypes from 'prop-types';
import Container from 'react-bootstrap/Container';
import { Clips } from '../../clips';
import { Header } from '../../header';
import { Preferences } from '../../preferences';
import { TemplateSelection } from '../../preferences/compile-templates/containers/TemplateSelection';
import { QuickClipSelection } from '../../preferences/quick-clip-launch/containers/QuickClipSelection';

export const Content = ({
  selectingQuickClips,
  viewingPreferences,
  showTemplateSelection
}) => (
  <Container fluid className="wrapper">
    { selectingQuickClips && <QuickClipSelection /> }
    { showTemplateSelection && !selectingQuickClips && <TemplateSelection /> }
    { !showTemplateSelection && !selectingQuickClips && [
      <Header key="header" />,
      viewingPreferences && <Preferences key="preferences" />,
      !viewingPreferences && <Clips key="clips" />,
    ]}
  </Container>
);
Content.propTypes = {
  selectingQuickClips: PropTypes.bool.isRequired,
  viewingPreferences: PropTypes.bool.isRequired,
  showTemplateSelection: PropTypes.bool.isRequired,
};
Content.displayName = 'Content';