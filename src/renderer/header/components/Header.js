import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import OutsideClickHandler from 'react-outside-click-handler';
import { Menu } from '../containers/Menu';

export const Header = ({
  menuVisible,
  toggleMenu,
  hideMenu,
}) => (
  <header className="Clipless-Clippings--header">
    <h1 className="Clipless-Clippings--header--heading">
      Clipless
    </h1>
    <OutsideClickHandler onOutsideClick={hideMenu}>
      <nav className={classnames('Clipless-Clippings--header--navigation', {
        'is-Active': menuVisible,
      })}>
        <h2 className="Clipless-Clippings--header--navigation--heading" onClick={toggleMenu}>
          <svg className="Clipless-Clippings--header--navigation--heading--icon" viewBox="0 0 24 24">
            <path d="M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z" />
          </svg>
          <span className="Clipless-Clippings--header--navigation--heading--text">Menu</span>
        </h2>
        { menuVisible && <Menu /> }
      </nav>
    </OutsideClickHandler>
  </header>
);
Header.propTypes = {
  menuVisible: PropTypes.bool.isRequired,
  toggleMenu: PropTypes.func.isRequired,
  hideMenu: PropTypes.func.isRequired,
};