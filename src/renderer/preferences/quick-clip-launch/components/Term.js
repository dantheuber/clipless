import React, { useState } from 'react';
import PropTypes from 'prop-types';
import ListGroup from 'react-bootstrap/ListGroup';
import Card from 'react-bootstrap/Card';
import { Draggable } from 'react-beautiful-dnd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export const Term = ({
  term,
  index,
  deleteTerm,
}) => {
  const [isEditing, setEditing] = useState(false);
  const [newRegex, setNewRegex] = useState(term.regex);
  return (
    <Draggable draggableId={term.name} index={index}>
      {provided => (
        <ListGroup.Item
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="qkTerm"
          key={term.name}
        >
          <Card className="qkCard">
            <Card.Header bg="primary">
              <FontAwesomeIcon icon="file-code" /> {term.name}
            </Card.Header>
            <Card.Body>
              <footer className="blockquote-footer" contentEditable={isEditing} onChange={({target: {value}}) => setNewRegex(value)}>
                {isEditing ? newRegex : term.regex}&nbsp;&nbsp;
                <FontAwesomeIcon icon="edit" onClick={() => setEditing(true)} />
              </footer>
              <Card.Link href="#" onClick={() => setEditing(true)}>
                Edit
              </Card.Link>
              <Card.Link style={{ color: 'red' }} href="#" onClick={() => deleteTerm(term)}>
                Delete <FontAwesomeIcon icon="trash" />
              </Card.Link>
            </Card.Body>
          </Card>
        </ListGroup.Item>
      )}
    </Draggable>
  );
};

Term.propTypes = {
  term: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  deleteTerm: PropTypes.func.isRequired,
};