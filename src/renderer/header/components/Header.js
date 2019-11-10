import React from 'react';
import Navbar from 'react-bootstrap/Navbar';
import { Menu } from '../containers/Menu';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export const Header = () => (
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
    <Navbar.Toggle aria-controls="navbar-menu" className="menu-toggle" size="sm" />
    <Navbar.Collapse id="navbar-menu" className="menu">
      <Menu />
    </Navbar.Collapse>
  </Navbar>
);
Header.propTypes = {};