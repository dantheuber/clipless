import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

export const ClipSettings = ({
  index,
  toggleLock,
  toggleClipSettings,
  settingsVisible,
}) => (
  <div className={classnames('Clipless-Clippings--main--clips-list--item--settings', {
    'is-Active': settingsVisible,
  })}>
    <h2 className="Clipless-Clippings--main--clips-list--item--settings--heading" onClick={() => toggleClipSettings(index)}>
      <svg className="Clipless-Clippings--main--clips-list--item--settings--heading--icon u-InlineIcon" viewBox="0 0 24 24">
        <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z" />
      </svg>
      <span className="Clipless-Clippings--main--clips-list--item--settings--heading--text">Settings</span>
    </h2>
    <ul className="Clipless-Clippings--main--clips-list--item--settings--list">
      <li className="Clipless-Clippings--main--clips-list--item--settings--list--item delete">
        <a className="Clipless-Clippings--main--clips-list--item--settings--list--item--link">
          <svg className="Clipless-Clippings--main--clips-list--item--settings--list--item--link--icon u-InlineIcon" viewBox="0 0 24 24">
            <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
          </svg>
          <span className="Clipless-Clippings--main--clips-list--item--settings--list--item--link--text">Delete</span>
        </a>
      </li>
      <li className="Clipless-Clippings--main--clips-list--item--settings--list--item unlock">
        <a className="Clipless-Clippings--main--clips-list--item--settings--list--item--link" onClick={() => toggleLock(index)}>
          <svg className="Clipless-Clippings--main--clips-list--item--settings--list--item--link--icon u-InlineIcon" viewBox="0 0 24 24">
            <path d="M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6C4.89,22 4,21.1 4,20V10A2,2 0 0,1 6,8H15V6A3,3 0 0,0 12,3A3,3 0 0,0 9,6H7A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,17A2,2 0 0,0 14,15A2,2 0 0,0 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17Z" />
          </svg>
          <span className="Clipless-Clippings--main--clips-list--item--settings--list--item--link--text">Unlock</span>
        </a>
      </li>
      <li className="Clipless-Clippings--main--clips-list--item--settings--list--item scan">
        <a className="Clipless-Clippings--main--clips-list--item--settings--list--item--link">
          <svg className="Clipless-Clippings--main--clips-list--item--settings--list--item--link--icon u-InlineIcon" viewBox="0 0 24 24">
            <path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" />
          </svg>
          <span className="Clipless-Clippings--main--clips-list--item--settings--list--item--link--text">Scan Clip</span>
        </a>
      </li>
    </ul>
  </div>
);
ClipSettings.propTypes = {
  index: PropTypes.number.isRequired,
  toggleLock: PropTypes.func.isRequired,
  toggleClipSettings: PropTypes.func.isRequired,
  settingsVisible: PropTypes.bool.isRequired,
};