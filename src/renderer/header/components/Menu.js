import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Nav from 'react-bootstrap/Nav';

export const Menu = ({
  menuVisible,
  viewPreferences,
  emptyAllClips,
  quitApp,
  toggleRef,
}) => (
  <Nav className="ml-auto">
    <Nav.Link key="Preferences" onClick={() => {
      viewPreferences();
      if (menuVisible) toggleRef.current.click();
    }}>
      <FontAwesomeIcon icon="user-cog" /> Preferences
    </Nav.Link>
    <Nav.Link key="EmptyClips" onClick={() => {
      emptyAllClips();
      if (menuVisible) toggleRef.current.click();
    }}>
      <FontAwesomeIcon icon="trash" /> Empty All Clips
    </Nav.Link>
    <Nav.Link key="QuitApp" onClick={quitApp}>
      <FontAwesomeIcon icon="sign-out-alt" /> Exit
    </Nav.Link>
  </Nav>
);
Menu.propTypes = {
  menuVisible: PropTypes.bool.isRequired,
  viewPreferences: PropTypes.func.isRequired,
  emptyAllClips: PropTypes.func.isRequired,
  quitApp: PropTypes.func.isRequired,
  toggleRef: PropTypes.oneOfType([
    PropTypes.func, 
    PropTypes.shape({ current: PropTypes.any })
  ]).isRequired,
};
