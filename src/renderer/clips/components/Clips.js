import React from 'react';
import PropTypes from 'prop-types';
import { CLIP_RENDER_ARRAY } from '../constants';
import { Clip } from '../containers/Clip';
import { MultiLineClipView } from '../containers/MultiLineClipView';

export const Clips = ({ viewingMultiLineEditor }) => (
  <div>
    { viewingMultiLineEditor && <MultiLineClipView /> }
    {
      !viewingMultiLineEditor && CLIP_RENDER_ARRAY.map((index) => <Clip key={index} index={index} />)
    }
  </div>
);
Clips.propTypes = {
  viewingMultiLineEditor: PropTypes.bool.isRequired,
};
Clips.displayName = 'Clips';
