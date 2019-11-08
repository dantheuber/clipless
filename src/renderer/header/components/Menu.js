import React from 'react';
import PropTypes from 'prop-types';

export const Menu = () => (
  <ul className="Clipless-Clippings--header--navigation--list">
    <li className="Clipless-Clippings--header--navigation--list--item preferences">
      <a href="javascript:void(0);" className="Clipless-Clippings--header--navigation--list--item--link">
        <svg className="Clipless-Clippings--header--navigation--list--item--link--icon u-InlineIcon">
          <path d="M2,3H22C23.05,3 24,3.95 24,5V19C24,20.05 23.05,21 22,21H2C0.95,21 0,20.05 0,19V5C0,3.95 0.95,3 2,3M14,6V7H22V6H14M14,8V9H21.5L22,9V8H14M14,10V11H21V10H14M8,13.91C6,13.91 2,15 2,17V18H14V17C14,15 10,13.91 8,13.91M8,6A3,3 0 0,0 5,9A3,3 0 0,0 8,12A3,3 0 0,0 11,9A3,3 0 0,0 8,6Z" />
        </svg>
        <span className="Clipless-Clippings--header--navigation--list--item--link--text">Preferences</span>
      </a>
    </li>
    <li className="Clipless-Clippings--header--navigation--list--item clear-clips">
      <a href="javascript:void(0);" className="Clipless-Clippings--header--navigation--list--item--link">
        <svg className="Clipless-Clippings--header--navigation--list--item--link--icon u-InlineIcon">
          <path d="M15,16H19V18H15V16M15,8H22V10H15V8M15,12H21V14H15V12M3,18A2,2 0 0,0 5,20H11A2,2 0 0,0 13,18V8H3V18M14,5H11L10,4H6L5,5H2V7H14V5Z" />
        </svg>
        <span className="Clipless-Clippings--header--navigation--list--item--link--text">Clear Clips</span>
      </a>
    </li>
    <li className="Clipless-Clippings--header--navigation--list--item exit">
      <a href="javascript:void(0);" className="Clipless-Clippings--header--navigation--list--item--link">
        <svg className="Clipless-Clippings--header--navigation--list--item--link--icon u-InlineIcon">
          <path d="M19,3H5C3.89,3 3,3.89 3,5V9H5V5H19V19H5V15H3V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M10.08,15.58L11.5,17L16.5,12L11.5,7L10.08,8.41L12.67,11H3V13H12.67L10.08,15.58Z" />
        </svg>
        <span className="Clipless-Clippings--header--navigation--list--item--link--text">Exit Clipless</span>
      </a>
    </li>
  </ul>
);
Menu.propTypes = {
  
};
