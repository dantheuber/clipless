import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import Container from 'react-bootstrap/Container';
import { Clips } from '../../clips';
import { Header } from '../../header';
import { Preferences } from '../../preferences';

export const Content = ({ viewingPreferences, transparent }) => (
  <Container fluid className={classnames('wrapper', {
    transparent,
  })}>
    <Header />
    { viewingPreferences && <Preferences /> }
    { !viewingPreferences && <Clips /> }
  </Container>
);
Content.propTypes = {
  viewingPreferences: PropTypes.bool.isRequired,
  transparent: PropTypes.bool.isRequired,
};
Content.displayName = 'Content';