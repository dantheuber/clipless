import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Nav from 'react-bootstrap/Nav';

export const Menu = ({
  toggleCompileTemplateSelector,
  menuVisible,
  viewPreferences,
  emptyAllClips,
  quitApp,
  toggleRef,
}) => (
  <Nav className="sm-auto">
    <Nav.Link key="Preferences" onClick={() => {
      viewPreferences();
      if (menuVisible) toggleRef.current.click();
    }}>
      <FontAwesomeIcon icon="user-cog" /> Preferences
    </Nav.Link>
    <Nav.Link key="templates" onClick={() =>{
      toggleCompileTemplateSelector();
      if (menuVisible) toggleRef.current.click();
    }}>
      <FontAwesomeIcon icon="paperclip" /> Compile Templates
    </Nav.Link>
    <Nav.Link key="EmptyClips" onClick={() => {
      emptyAllClips();
      if (menuVisible) toggleRef.current.click();
    }}>
      <FontAwesomeIcon icon="trash" /> Empty Clips
    </Nav.Link>
    <Nav.Link key="QuitApp" onClick={quitApp}>
      <FontAwesomeIcon icon="sign-out-alt" /> Exit
    </Nav.Link>
  </Nav>
);
Menu.propTypes = {
  toggleCompileTemplateSelector: PropTypes.func.isRequired,
  menuVisible: PropTypes.bool.isRequired,
  viewPreferences: PropTypes.func.isRequired,
  emptyAllClips: PropTypes.func.isRequired,
  quitApp: PropTypes.func.isRequired,
  toggleRef: PropTypes.oneOfType([
    PropTypes.func, 
    PropTypes.shape({ current: PropTypes.any })
  ]).isRequired,
};
