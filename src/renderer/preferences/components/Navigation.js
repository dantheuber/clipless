import React from 'react';
import PropTypes from 'prop-types';
import Nav from 'react-bootstrap/Nav';

export const Navigation = ({
  viewingTemplates,
  viewingGeneralPrefs,
  viewingQuickClips,
  viewTemplates,
  viewGeneralPrefs,
  viewQuickClips,
}) => (
  <Nav className="justify-content-center"  variant="tabs">
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
    <Nav.Item>
      <Nav.Link
        active={viewingQuickClips}
        onClick={(e) => {
          e.preventDefault();
          viewQuickClips();
        }}
      >
        Quick Clips
      </Nav.Link>
    </Nav.Item>
  </Nav>
);
Navigation.propTypes = {
  viewingTemplates: PropTypes.bool.isRequired,
  viewingGeneralPrefs: PropTypes.bool.isRequired,
  viewingQuickClips: PropTypes.bool.isRequired,
  viewGeneralPrefs: PropTypes.func.isRequired,
  viewTemplates: PropTypes.func.isRequired,
  viewQuickClips: PropTypes.func.isRequired,
};