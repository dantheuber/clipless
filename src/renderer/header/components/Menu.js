import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Nav from 'react-bootstrap/Nav';
// import Button from 'react-bootstrap/Button';
// import Popover from 'react-bootstrap/Popover';
// import OverlayTrigger from 'react-bootstrap/OverlayTrigger';

export const Menu = ({
  toggleCompileTemplateSelector,
  menuVisible,
  viewPreferences,
  emptyAllClips,
  quitApp,
  toggleRef,
}) => {
  const emptyRef = useRef(null);
  return (
    <Nav className="sm-auto">
      <Nav.Link key="Preferences" onClick={() => {
        viewPreferences();
        if (menuVisible) toggleRef.current.click();
      }}>
        <FontAwesomeIcon icon="user-cog" /> Preferences
      </Nav.Link>
      <Nav.Link key="templates" onClick={() =>{
        toggleCompileTemplateSelector();
        if (menuVisible) toggleRef.current.click();
      }}>
        <FontAwesomeIcon icon="paperclip" /> Compile Templates
      </Nav.Link>
      {/* <OverlayTrigger
        trigger="click"
        placement="bottom"
        overlay={
          <Popover id="empty-all-popover">
            <Popover.Title>Empty ALL clips</Popover.Title>
            <Popover.Content>
              This is not reversable, are you sure?
              <Button
                variant="success"
                onClick={() => {
                  emptyAllClips();
                  emptyRef.current.click();
                  if (menuVisible) toggleRef.current.click();
                }}
              >
                <FontAwesomeIcon icon="trash" /> Empty All
              </Button>
              <Button
                variant="outline-secondary"
                onClick={() => {
                  emptyRef.current.click();
                  if (menuVisible) toggleRef.current.click();
                }}
              >
                Cancel
              </Button>
            </Popover.Content>
          </Popover>
        }
      >
        <Nav.Link ref={emptyRef} key="EmptyClips">
          <FontAwesomeIcon icon="trash" /> Empty Clips
        </Nav.Link>
      </OverlayTrigger> */}
      <Nav.Link key="QuitApp" onClick={quitApp}>
        <FontAwesomeIcon icon="sign-out-alt" /> Exit
      </Nav.Link>
    </Nav>
  );
};
Menu.propTypes = {
  toggleCompileTemplateSelector: PropTypes.func.isRequired,
  menuVisible: PropTypes.bool.isRequired,
  viewPreferences: PropTypes.func.isRequired,
  emptyAllClips: PropTypes.func.isRequired,
  quitApp: PropTypes.func.isRequired,
  toggleRef: PropTypes.oneOfType([
    PropTypes.func, 
    PropTypes.shape({ current: PropTypes.any })
  ]).isRequired,
};
