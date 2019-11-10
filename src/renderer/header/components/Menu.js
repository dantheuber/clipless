import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Nav from 'react-bootstrap/Nav';

export const Menu = ({
  emptyAllClips,
  quitApp,
}) => (
  <Nav className="mr-auto">
    {/* <Nav.Link key="Preferences">
      <FontAwesomeIcon icon="user-cog" /> Preferences
    </Nav.Link> */}
    <Nav.Link key="EmptyClips" onClick={emptyAllClips}>
      <FontAwesomeIcon icon="trash" /> Empty All Clips
    </Nav.Link>
    <Nav.Link key="QuitApp" onClick={quitApp}>
      <FontAwesomeIcon icon="sign-out-alt" /> Exit
    </Nav.Link>
  </Nav>
);
Menu.propTypes = {
  emptyAllClips: PropTypes.func.isRequired,
  quitApp: PropTypes.func.isRequired,
};
