import React from 'react';
import PropTypes from 'prop-types';

export const Clips = ({ clips }) => (
  <ol>
    { clips.map(clip => <li>{clip}</li>) }
  </ol>
);
Clips.propTypes = {
  clips: PropTypes.arrayOf(PropTypes.object).isRequired,
};
Clips.displayName = 'Clips';
