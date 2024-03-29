import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import InputGroup from 'react-bootstrap/InputGroup';
import Button from 'react-bootstrap/Button';
import FormControl from 'react-bootstrap/FormControl';
import Overlay from 'react-bootstrap/Overlay';
import Tooltip from 'react-bootstrap/Tooltip';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ClipSettings } from '../containers/ClipSettings';

export const Clip = ({
  style,
  clip,
  index,
  clipModified,
  clipSelected,
  showCopiedTooltip,
  scanClipForTerms,
}) => {
  const target = useRef(null);
  return (
    <InputGroup size="sm" style={style}>
      <InputGroup.Prepend className="clip-number">
        <Button
          tabIndex="-1"
          ref={target}
          variant="dark"
          onClick={() => clipSelected(index)}
        >
          { index + 1}
        </Button>
        <Overlay
          target={target.current}
          id={`clip-${index + 1}-copied-overlay`}
          placement="right"
          show={showCopiedTooltip}
        >
          <Tooltip id={`clip-${index + 1}-copied-tooltip`}>
            Copied!
          </Tooltip>
        </Overlay>
      </InputGroup.Prepend>
      <FormControl
        tabIndex={index + 1}
        className="clip"
        value={clip}
        readOnly={index === 0}
        onChange={e => clipModified(e, index)}
      />
      <InputGroup.Append className="clip-settings">
        { index === 0 ? (
          <Button tabIndex="-1" variant="dark" onClick={() => scanClipForTerms(index)}>
            <FontAwesomeIcon icon="search" />
          </Button>
        ) : <ClipSettings index={index} /> }
      </InputGroup.Append>
    </InputGroup>
  );
};

Clip.propTypes = {
  clip: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
  clipModified: PropTypes.func.isRequired,
  clipSelected: PropTypes.func.isRequired,
  scanClipForTerms: PropTypes.func.isRequired,
  showCopiedTooltip: PropTypes.bool.isRequired,
};
