import React, { useState } from 'react';
import PropTypes from 'prop-types';
import ListGroup from 'react-bootstrap/ListGroup';
import InputGroup from 'react-bootstrap/InputGroup';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import { Draggable } from 'react-beautiful-dnd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { AssociateTerms } from '../containers/AssociateTerms';

export const Tool = ({
  tool,
  index,
  deleteTool,
  toggleToolEncode,
  updateToolUrl,
  toolAssociatedTermsCount
}) => {
  const [isEditing, setEditing] = useState(false);
  const [newUrl, setNewUrl] = useState(tool.url);
  const tokenRegex = /\{[a-zA-Z0-9|]+\}/g;
  const newUrlIsInvalid = () => !tokenRegex.exec(newUrl);
  const newUrlIsValid = () => newUrl !== '' && tokenRegex.exec(newUrl);

  return (
    <Draggable draggableId={tool.name} index={index}>
      {provided => (
        <ListGroup.Item
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="qkTool"
          key={tool.name}
        >
          <Card className="qkCard">
            <Card.Header bg="primary">
              <FontAwesomeIcon icon="wrench" /> {tool.name}
            </Card.Header>
            <Card.Body>
              { isEditing && <Form>
                <InputGroup size="sm" hasValidation>
                  <Form.Control
                    size="xs"
                    required
                    isInvalid={newUrlIsInvalid()}
                    isValid={newUrlIsValid()}
                    type="text"
                    value={newUrl}
                    onChange={({target: {value}}) => setNewUrl(value)}
                  />
                  <InputGroup.Append>
                    <ButtonGroup size="sm">
                      <Button
                        size="xs"
                        disabled={newUrlIsInvalid()}
                        variant="primary"
                        onClick={() => {
                          updateToolUrl(tool, newUrl);
                          setEditing(false);
                        }}
                      >
                        Save
                      </Button>
                      <Button
                        size="xs"  
                        variant="outline-secondary"
                        onClick={() => {
                          setNewUrl(tool.url);
                          setEditing(false);
                        }}
                      >
                        Cancel
                      </Button>
                    </ButtonGroup>                  
                  </InputGroup.Append>
                  <Form.Control.Feedback type="invalid">Your URL must contain a <code>{'{named}'}</code> token where the capture group of the same name will be passed as a query string parameter.</Form.Control.Feedback>
                </InputGroup>
              </Form>}
              { !isEditing && <footer className="blockquote-footer">
                {tool.url}
              </footer>}
              <Form.Check
                custom
                type="switch"
                id={`toggle-${tool.name.replace(' ', '')}-encode`}
                checked={tool.encode}
                onChange={() => toggleToolEncode(tool)}
                label="Encode Term as URI component"
              />
              { !isEditing && (
                <Card.Text className="qkAssociatedTools">
                  Associated Search Terms: <Badge variant="dark">{toolAssociatedTermsCount(tool)}</Badge><br />
                  { Object.keys(tool.terms).filter(term => tool.terms[term]).map(term => (
                    <p className="qkAssociatedTool">
                      <FontAwesomeIcon icon="check-square" /> {term}
                    </p>
                  ))}
                </Card.Text>
              )}
              { isEditing && (
                <Card.Text>
                  <AssociateTerms tool={tool} />
                </Card.Text>
              )}
              <Card.Link href={isEditing ? null:'#'} onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setEditing(true);
              }}>
                <FontAwesomeIcon icon="edit" /> Edit
              </Card.Link>
              <Card.Link style={{color: 'red'}} href="#" onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                deleteTool(tool);
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

Tool.propTypes = {
  tool: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  deleteTool: PropTypes.func.isRequired,
  toggleToolEncode: PropTypes.func.isRequired,
  updateToolUrl: PropTypes.func.isRequired,
  toolAssociatedTermsCount: PropTypes.func.isRequired,
};