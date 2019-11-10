import React from 'react';
import Navbar from 'react-bootstrap/Navbar';
import { Menu } from '../containers/Menu';

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
      Clipless
    </Navbar.Brand>
    <Navbar.Toggle aria-controls="navbar-menu" className="menu-toggle" size="sm" />
    <Navbar.Collapse id="navbar-menu" align="right" className="menu">
      <Menu />
    </Navbar.Collapse>
  </Navbar>
);
Header.propTypes = {};