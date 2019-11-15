import React from 'react';
import PropTypes from 'prop-types';
import Container from 'react-bootstrap/Container';
import { Clips } from '../../clips';
import { Header } from '../../header';
import { Preferences } from '../../preferences';

export const Content = ({ viewingPreferences }) => (
  <Container fluid className="wrapper">
    <Header />
    { viewingPreferences && <Preferences /> }
    { !viewingPreferences &&
      <div className="main">
        <Clips />
      </div>
    }
  </Container>
);
Content.propTypes = {
  viewingPreferences: PropTypes.bool.isRequired,
};
Content.displayName = 'Content';