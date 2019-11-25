import React from 'react';
import PropTypes from 'prop-types';
import AutoSizer from 'react-virtualized/dist/commonjs/AutoSizer';
import List from 'react-virtualized/dist/commonjs/List';
import { OVERSCAN_ROWS } from '../constants';
import { Clip } from '../containers/Clip';
import { ClipEditor } from '../containers/ClipEditor';
import 'react-virtualized/styles.css';

const rowRenderer = ({ index, key, style }) => (
  <Clip key={key} index={index} style={style} />
);

export const Clips = ({ viewingClipEditor, numberOfClips }) => (
  <div className="main clips">
    { viewingClipEditor && <ClipEditor /> }
    { !viewingClipEditor && (
      <AutoSizer>
        {({width,height}) => (
          <List
            rowHeight={31}
            overscanRowCount={OVERSCAN_ROWS}
            rowCount={numberOfClips}
            rowRenderer={rowRenderer}
            width={width}
            height={height}
          />
        )}
      </AutoSizer>
    )}
  </div>
);

Clips.propTypes = {
  viewingClipEditor: PropTypes.bool.isRequired,
  numberOfClips: PropTypes.number.isRequired,
};
Clips.displayName = 'Clips';
