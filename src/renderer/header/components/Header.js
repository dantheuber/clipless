import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import Navbar from 'react-bootstrap/Navbar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Menu } from '../containers/Menu';

export const Header = ({ toggleMenu }) => {
  const toggleRef = useRef(null);
  return (
    <Navbar
      className="header"
      collapseOnSelect
      fixed="top"
      bg="dark"
      variant="dark"
      expand="sm"
    >
      <Navbar.Brand>
        <FontAwesomeIcon icon="clipboard-list" /> Clipless
      </Navbar.Brand>
      <Navbar.Toggle
        onClick={toggleMenu}
        ref={toggleRef}
        aria-controls="navbar-menu"
        className="menu-toggle"
        size="sm"
      />
      <Navbar.Collapse id="navbar-menu" className="menu">
        <Menu toggleRef={toggleRef} />
      </Navbar.Collapse>
    </Navbar>
  );
};
Header.propTypes = {
  toggleMenu: PropTypes.func.isRequired,
};