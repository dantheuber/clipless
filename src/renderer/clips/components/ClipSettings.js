import React from 'react';
import PropTypes from 'prop-types';
import Button from 'react-bootstrap/Button';
import OutsideClickHandler from 'react-outside-click-handler';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export const ClipSettings = ({
  index,
  emptyClip,
  toggleLock,
  toggleClipSettings,
  hideClipSettings,
  settingsVisible,
  clipIsLocked,
}) => (
  <OutsideClickHandler onOutsideClick={() => hideClipSettings(index)}>
    { settingsVisible && [
      <Button key="trash" onClick={() => emptyClip(index)}>
        <FontAwesomeIcon icon="trash" />
      </Button>,
      index === 0 ? null : <Button key="lock" onClick={() => toggleLock(index)}>
        <FontAwesomeIcon icon={clipIsLocked ? 'lock' : 'lock-open'} />
      </Button>,
      <Button key="scan">
        <FontAwesomeIcon icon="search" />
      </Button>
    ]}
    <Button onClick={() => toggleClipSettings(index)}>
      <FontAwesomeIcon icon="cog" />
    </Button>
  </OutsideClickHandler>
);
ClipSettings.propTypes = {
  index: PropTypes.number.isRequired,
  emptyClip: PropTypes.func.isRequired,
  toggleLock: PropTypes.func.isRequired,
  toggleClipSettings: PropTypes.func.isRequired,
  hideClipSettings: PropTypes.func.isRequired,
  settingsVisible: PropTypes.bool.isRequired,
  clipIsLocked: PropTypes.bool.isRequired,
};
