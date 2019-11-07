import React from 'react';
import { CLIP_RENDER_ARRAY } from '../constants';
import { Clip } from '../containers/Clip';

export const Clips = () => (
  <ol>
    { CLIP_RENDER_ARRAY.map((index) => <Clip index={index} />) }
  </ol>
);
Clips.propTypes = {};
Clips.displayName = 'Clips';
