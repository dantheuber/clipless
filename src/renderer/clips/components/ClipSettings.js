import React from 'react';
import PropTypes from 'prop-types';
import Button from 'react-bootstrap/Button';
import OutsideClickHandler from 'react-outside-click-handler';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export const ClipSettings = ({
  toggleClipSettings,
  hideClipSettings,
  settingsVisible,
  clipIsLocked,
  toggleLock,
  emptyClip,
  index,
}) => (
  <OutsideClickHandler onOutsideClick={() => hideClipSettings(index)}>
    { settingsVisible && [
      <Button key="trash" variant="dark" onClick={() => emptyClip(index)}>
        <FontAwesomeIcon icon="trash" />
      </Button>,
      <Button key="lock" variant="dark" onClick={() => toggleLock(index)}>
        <FontAwesomeIcon icon={clipIsLocked ? 'lock' : 'lock-open'} />
      </Button>,
      <Button key="scan" variant="dark">
        <FontAwesomeIcon icon="search" />
      </Button>
    ]}
    <Button variant="dark" onClick={() => toggleClipSettings(index)}>
      <FontAwesomeIcon icon="cog" />
    </Button>
  </OutsideClickHandler>
);
ClipSettings.propTypes = {
  toggleClipSettings: PropTypes.func.isRequired,
  hideClipSettings: PropTypes.func.isRequired,
  settingsVisible: PropTypes.bool.isRequired,
  clipIsLocked: PropTypes.bool.isRequired,
  toggleLock: PropTypes.func.isRequired,
  emptyClip: PropTypes.func.isRequired,
  index: PropTypes.number.isRequired,
};
ClipSettings.displayName = 'ClipSettings';
