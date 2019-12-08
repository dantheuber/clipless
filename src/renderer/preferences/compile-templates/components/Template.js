import React from 'react';
import PropTypes from 'prop-types';
import Button from 'react-bootstrap/Button';
import ListGroup from 'react-bootstrap/ListGroup';
import InputGroup from 'react-bootstrap/InputGroup';
import FormControl from 'react-bootstrap/FormControl';
import { Draggable } from 'react-beautiful-dnd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export const Template = ({
  index,
  template,
  deleteTemplate,
  updateTemplateName,
  updateTemplateContent,
}) => (
  <Draggable draggableId={template.id} index={index}>
    {provided => (
      <ListGroup.Item as="li"
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
      >
        <InputGroup>
          <InputGroup.Prepend>
            <InputGroup.Text>Name</InputGroup.Text>
          </InputGroup.Prepend>
          <FormControl
            id={`name-${template.id}`}
            value={template.name}
            onChange={e => updateTemplateName(e, template)}
          />
          <InputGroup.Append>
            <Button variant="danger" onClick={() => deleteTemplate(index)}>
              <FontAwesomeIcon icon="trash" />
            </Button>
          </InputGroup.Append>
        </InputGroup>
        <FormControl
          as="textarea"
          id={`content-${template.id}`}
          value={template.content}
          onChange={e => updateTemplateContent(e, template)}
        />
      </ListGroup.Item>
    )}
  </Draggable>
);
Template.propTypes = {
  index: PropTypes.number.isRequired,
  template: PropTypes.object.isRequired,
  deleteTemplate: PropTypes.func.isRequired,
  updateTemplateName: PropTypes.func.isRequired,
  updateTemplateContent: PropTypes.func.isRequired,
}