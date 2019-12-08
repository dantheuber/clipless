import React from 'react';
import PropTypes from 'prop-types';
import Container from 'react-bootstrap/Container';
import { Clips } from '../../clips';
import { Header } from '../../header';
import { Preferences } from '../../preferences';
import { TemplateSelection } from '../../preferences/compile-templates/containers/TemplateSelection';

export const Content = ({
  viewingPreferences,
  showTemplateSelection
}) => (
  <Container fluid className="wrapper">
    { showTemplateSelection && <TemplateSelection /> }
    { !showTemplateSelection && [
      <Header key="header" />,
      viewingPreferences && <Preferences key="preferences" />,
      !viewingPreferences && <Clips key="clips" />,
    ]}
  </Container>
);
Content.propTypes = {
  viewingPreferences: PropTypes.bool.isRequired,
  showTemplateSelection: PropTypes.bool.isRequired,
};
Content.displayName = 'Content';