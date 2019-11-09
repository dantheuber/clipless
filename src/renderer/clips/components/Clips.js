import React from 'react';
import { CLIP_RENDER_ARRAY } from '../constants';
import { Clip } from '../containers/Clip';

export const Clips = () => (
  <main className="Clipless-Clippings--main">
    <ul className="Clipless-Clippings--main--clips-list">
      { CLIP_RENDER_ARRAY.map((index) => <Clip key={index} index={index} />) }
    </ul>
  </main>
);
Clips.propTypes = {};
Clips.displayName = 'Clips';
