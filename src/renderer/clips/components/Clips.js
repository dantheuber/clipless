import React from 'react';
import PropTypes from 'prop-types';
import { Clip } from '../containers/Clip';
import { ClipEditor } from '../containers/ClipEditor';

const renderClips = (num) => {
  const clipsArray = [];
  for (let index = 0; index < num; index++) {
    clipsArray.push(<Clip key={index} index={index} />);
  }
  return clipsArray;
};

export const Clips = ({ viewingClipEditor, numberOfClips }) => (
  <div className="main clips">
    { viewingClipEditor && <ClipEditor /> }
    { !viewingClipEditor && renderClips(numberOfClips) }
  </div>
);

Clips.propTypes = {
  viewingClipEditor: PropTypes.bool.isRequired,
  numberOfClips: PropTypes.number.isRequired,
};
Clips.displayName = 'Clips';
