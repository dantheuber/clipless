import React from 'react';
import { CLIP_RENDER_ARRAY } from '../constants';
import { Clip } from '../containers/Clip';

export const Clips = () => (
  <div>
    { CLIP_RENDER_ARRAY.map((index) => <Clip key={index} index={index} />) }
  </div>
);
Clips.propTypes = {};
Clips.displayName = 'Clips';
