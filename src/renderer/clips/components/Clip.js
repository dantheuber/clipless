import React from 'react';
import PropTypes from 'prop-types';

export const Clip = ({
  clip,
  index,
  isLocked,
  toggleLock,
}) => (
  <li>
    <input type="text" value={clip} />
    <input
      type="button"
      onClick={() => toggleLock(index)}
      value={isLocked ? 'Unlock' : 'Lock'}
    />
  </li>
);

Clip.propTypes = {
  clip: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
  isLocked: PropTypes.bool.isRequired,
  toggleLock: PropTypes.func.isRequired,
};
