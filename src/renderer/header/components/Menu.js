import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Nav from 'react-bootstrap/Nav';

export const Menu = ({
  emptyAllClips,
  quitApp,
}) => (
  <Nav className="mr-auto" align="right">
    <Nav.Link key="Preferences">
      Preferences <FontAwesomeIcon icon="user-cog" />
    </Nav.Link>
    <Nav.Link key="EmptyClips" onClick={emptyAllClips}>
      Empty Clips <FontAwesomeIcon icon="trash" />
    </Nav.Link>
    <Nav.Link key="QuitApp" onClick={quitApp}>
      Exit <FontAwesomeIcon icon="sign-out-alt" />
    </Nav.Link>
  </Nav>
);
Menu.propTypes = {
  emptyAllClips: PropTypes.func.isRequired,
  quitApp: PropTypes.func.isRequired,
};
