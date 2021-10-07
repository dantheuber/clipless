import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Button from 'react-bootstrap/Button';
import OutsideClickHandler from 'react-outside-click-handler';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export const ClipSettings = ({
  viewMultiLineEditor,
  scanClipForTerms,
  clipIsLocked,
  toggleLock,
  emptyClip,
  index,
}) => {
  const [visible, setVisible] = useState(false);
  const toggleVisibility = () => setVisible(!visible);
  return (
    <OutsideClickHandler onOutsideClick={() => setVisible(false)}>
      { visible && [
        <Button key="trash" variant="dark" onClick={() => emptyClip(index)}>
          <FontAwesomeIcon icon="trash" />
        </Button>,
        <Button key="lock" variant="dark" onClick={() => toggleLock(index)}>
          <FontAwesomeIcon icon={clipIsLocked ? 'lock-open' : 'lock'} />
        </Button>,
        <Button key="scan" variant="dark" onClick={() => scanClipForTerms(index)}>
          <FontAwesomeIcon icon="search" />
        </Button>,
        <Button key="edit" variant="dark" onClick={() => viewMultiLineEditor(index)}>
          <FontAwesomeIcon icon="edit" />
        </Button>,
      ]}
      <Button variant="dark" onClick={() => toggleVisibility()}>
        <FontAwesomeIcon icon={clipIsLocked ? 'lock' : 'cog'} />
      </Button>
    </OutsideClickHandler>
  );
};

ClipSettings.propTypes = {
  viewMultiLineEditor: PropTypes.func.isRequired,
  scanClipForTerms: PropTypes.func.isRequired,
  clipIsLocked: PropTypes.bool.isRequired,
  toggleLock: PropTypes.func.isRequired,
  emptyClip: PropTypes.func.isRequired,
  index: PropTypes.number.isRequired,
};
ClipSettings.displayName = 'ClipSettings';
