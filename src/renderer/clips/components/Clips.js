import React from 'react';
import PropTypes from 'prop-types';
import { CLIP_RENDER_ARRAY } from '../constants';
import { Clip } from '../containers/Clip';
import { ClipEditor } from '../containers/ClipEditor';

export const Clips = ({ viewingClipEditor }) => (
  <div className="main clips">
    { viewingClipEditor && <ClipEditor /> }
    {
      !viewingClipEditor && CLIP_RENDER_ARRAY.map((index) => <Clip key={index} index={index} />)
    }
  </div>
);
Clips.propTypes = {
  viewingClipEditor: PropTypes.bool.isRequired,
};
Clips.displayName = 'Clips';
