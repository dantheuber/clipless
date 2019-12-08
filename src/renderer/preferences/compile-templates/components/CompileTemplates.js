import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import Button from 'react-bootstrap/Button';
import ButtonToolbar from 'react-bootstrap/ButtonToolbar';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Overlay from 'react-bootstrap/Overlay';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import { FilePicker } from 'react-file-picker';
import { DragDropContext, Droppable } from 'react-beautiful-dnd';
import { TemplatesList } from '../containers/TemplatesList';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export const CompileTemplates = ({
  createNewTemplate,
  handleDragAndDrop,
  exportTemplates,
  importTemplates,
}) => {
  const [show, setShow] = useState(false);
  const [target, setTarget] = useState(null);
  const ref = useRef(null);

  const mouseEnter = event => {
    setTarget(event.target);
    setShow(true);
  };
  const mouseLeave = () => {
    setShow(false);
  };

  return (
    <Container>
      <Row>
        <ButtonToolbar>
          <ButtonGroup className="mr-2">
            <OverlayTrigger
              placement="bottom"
              overlay={<Tooltip id="add-new">Create New Template</Tooltip>}
            >
              <Button variant="primary" onClick={createNewTemplate}>
                <FontAwesomeIcon icon="plus" />
              </Button>
            </OverlayTrigger>
          </ButtonGroup>
          <ButtonGroup className="mr-2">
            <OverlayTrigger
              placement="bottom"
              overlay={<Tooltip id="export">Export Templates</Tooltip>}
            >
              <Button variant="info" onClick={exportTemplates}>
                <FontAwesomeIcon icon="download" />
              </Button>
            </OverlayTrigger>
            <Overlay
              show={show}
              target={target}
              placement="bottom"
            >
              <Tooltip id="import">Import Templates</Tooltip>
            </Overlay>
            <FilePicker
              extensions={['json']}
              onChange={importTemplates}
              onError={alert}
            >
              <Button variant="info" ref={ref} onMouseEnter={mouseEnter} onMouseLeave={mouseLeave}>
                <FontAwesomeIcon icon="file-import" />
              </Button>
            </FilePicker>
          </ButtonGroup>
        </ButtonToolbar>
      </Row>
      <Row>
        <DragDropContext onDragEnd={handleDragAndDrop}>
          <Droppable droppableId="list">
            {provided => (
              <div ref={provided.innerRef} {...provided.droppableProps}>
                <TemplatesList />
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </Row>
    </Container>
  );
}
CompileTemplates.propTypes = {
  createNewTemplate: PropTypes.func.isRequired,
  handleDragAndDrop: PropTypes.func.isRequired,
  exportTemplates: PropTypes.func.isRequired,
  importTemplates: PropTypes.func.isRequired,
};