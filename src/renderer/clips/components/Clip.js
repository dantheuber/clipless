import React from 'react';
import PropTypes from 'prop-types';

export const Clip = ({
  clip,
  index,
  isLocked,
  toggleLock,
  clipModified,
}) => (
  <li>
    <input type="text" onChange={e => clipModified(e, index)} value={clip} />
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
  clipModified: PropTypes.func.isRequired,
};
