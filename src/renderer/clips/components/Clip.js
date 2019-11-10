import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import InputGroup from 'react-bootstrap/InputGroup';
import Button from 'react-bootstrap/Button';
import FormControl from 'react-bootstrap/FormControl';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Overlay from 'react-bootstrap/Overlay';
import Tooltip from 'react-bootstrap/Tooltip';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ClipSettings } from '../containers/ClipSettings';
import { TOOLTIP_DELAY } from '../constants';

export const Clip = ({
  clip,
  index,
  clipModified,
  clipSelected,
  showCopiedTooltip,
}) => {
  const target = useRef(null);
  return (
    <InputGroup size="sm">
      <InputGroup.Prepend className="clip-number">
        <OverlayTrigger
          placement="right"
          trigger="hover"
          delay={TOOLTIP_DELAY}
          overlay={
            <Tooltip id={`select-clip-${index + 1}-tooltip`}>
              Select This Clip
            </Tooltip>
          }
        >
          <Button
            ref={target}
            variant="dark"
            onClick={() => clipSelected(index)}
          >
            { index + 1}
          </Button>
        </OverlayTrigger>
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
        className="clip"
        value={clip}
        readOnly={index === 0}
        onChange={e => clipModified(e, index)}
      />
      <InputGroup.Append className="clip-settings">
        { index === 0 ? (
          <Button variant="dark" onClick={() => clipSelected(index)}>
            <FontAwesomeIcon icon="clipboard" />
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
  showCopiedTooltip: PropTypes.bool.isRequired,
};
