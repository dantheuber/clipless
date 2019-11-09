import React from 'react';
import PropTypes from 'prop-types';
import { ClipSettings } from '../containers/ClipSettings';

export const Clip = ({
  clip,
  index,
  clipModified,
  clipSelected,
}) => (
  <li className="Clipless-Clippings--main--clips-list--item">
    <a className="Clipless-Clippings--main--clips-list--item--paste-button" onClick={() => clipSelected(index)}>
      <span className="Clipless-Clippings--main--clips-list--item--paste-button--text">Paste Clip</span>
      <span className="Clipless-Clippings--main--clips-list--item--paste-button--number">{index + 1}</span>
    </a>
    <div className="Clipless-Clippings--main--clips-list--item--clipping">
      <textarea
        className="Clipless-Clippings--main--clips-list--item--clipping--textarea"
        onChange={e => clipModified(e, index)}
        value={clip}
      />
    </div>
    <ClipSettings index={index} />
  </li>
);

Clip.propTypes = {
  clip: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
  clipModified: PropTypes.func.isRequired,
  clipSelected: PropTypes.func.isRequired,
};
