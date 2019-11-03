import React from 'react';
import PropTypes from 'prop-types';

export const Clips = ({ clips }) => (
  <ul>
    { clips.map(clip => <li>{clip}</li>) }
  </ul>
);
Clips.propTypes = {
  clips: PropTypes.arrayOf(PropTypes.object).isRequired,
};
Clips.displayName = 'Clips';
