import React from 'react';
import PropTypes from 'prop-types';
import Nav from 'react-bootstrap/Nav';

export const Navigation = ({
  viewingTemplates,
  viewingGeneralPrefs,
  viewTemplates,
  viewGeneralPrefs,
}) => (
  <Nav justify variant="pills">
    <Nav.Item>
      <Nav.Link
        onClick={(e) => {
          e.preventDefault();
          viewGeneralPrefs();
        }}
        active={viewingGeneralPrefs}
      >
        General
      </Nav.Link>
    </Nav.Item>
    <Nav.Item>
      <Nav.Link
      active={viewingTemplates}
        onClick={(e) => {
          e.preventDefault();
          viewTemplates();
        }}
      >
        Compilation Templates
      </Nav.Link>
    </Nav.Item>
  </Nav>
);
Navigation.propTypes = {
  viewingTemplates: PropTypes.bool.isRequired,
  viewingGeneralPrefs: PropTypes.bool.isRequired,
  viewGeneralPrefs: PropTypes.func.isRequired,
  viewTemplates: PropTypes.func.isRequired,
};