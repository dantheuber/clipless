import React from 'react';
import PropTypes from 'prop-types';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import { DragDropContext, Droppable } from 'react-beautiful-dnd';
import { TemplatesList } from '../containers/TemplatesList';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export const CompileTemplates = ({
  createNewTemplate,
  handleDragAndDrop,
  exportTemplates,
}) => (
  <Container className="main">
    <Button variant="success" onClick={createNewTemplate}>
      New Template
    </Button>
    <Button variant="info" onClick={exportTemplates}>
      <FontAwesomeIcon icon="download" />
    </Button>
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
  </Container>
);
CompileTemplates.propTypes = {
  createNewTemplate: PropTypes.func.isRequired,
  handleDragAndDrop: PropTypes.func.isRequired,
  exportTemplates: PropTypes.func.isRequired,
};