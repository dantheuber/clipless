import React, { useState } from 'react';
import PropTypes from 'prop-types';
import ListGroup from 'react-bootstrap/ListGroup';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import InputGroup from 'react-bootstrap/InputGroup';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import { Draggable } from 'react-beautiful-dnd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export const Term = ({
  term,
  index,
  deleteTerm,
}) => {
  const [isEditing, setEditing] = useState(false);
  const [newRegex, setNewRegex] = useState(term.regex);
  const isRegexInvalid = () => {
    let termRegexError = false;
    try {
      new RegExp(newRegex, 'g');
      termRegexError = false;
    } catch (e) {
      termRegexError = true;
    }
    return termRegexError;
  };
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
              { isEditing && <Form>
                <InputGroup size="sm" hasValidation>
                  <Form.Control
                    size="xs"
                    required
                    isInvalid={isRegexInvalid()}
                    isValid={!isRegexInvalid()}
                    type="text"
                    value={newRegex}
                    onChange={({target:{value}}) => setNewRegex(value)}
                  />
                  <InputGroup.Append>
                    <ButtonGroup size="sm">
                      <Button
                        size="xs"
                        disabled={isRegexInvalid()}
                        variant="primary"
                        onClick={() => {
                          updateTermRegex(term, newRegex);
                          setEditing(false);
                        }}
                      >
                        Save
                      </Button>
                      <Button
                        size="xs"
                        variant="outline-secondary"
                        onClick={() => {
                          setNewRegex(term.regex);
                          setEditing(false);
                        }}
                      >
                        Cancel
                      </Button>
                    </ButtonGroup>
                  </InputGroup.Append>
                  <Form.Control.Feedback type="invalid">Invalid Regular Expression</Form.Control.Feedback>
                </InputGroup>
              </Form>}
              { !isEditing && <Card.Text>Regex: <code>{term.regex}</code></Card.Text> }
              <Card.Link href={isEditing ? null:'#'} onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setEditing(true);
              }}>
                <FontAwesomeIcon icon="edit" /> Edit
              </Card.Link>
              <Card.Link style={{ color: 'red' }} href="#" onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                deleteTerm(term);
              }}>
                <FontAwesomeIcon icon="trash" /> Delete
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