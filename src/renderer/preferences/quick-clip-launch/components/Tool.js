import React, { useState } from 'react';
import PropTypes from 'prop-types';
import ListGroup from 'react-bootstrap/ListGroup';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import { Draggable } from 'react-beautiful-dnd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { AssociateTerms } from '../containers/AssociateTerms';

export const Tool = ({
  tool,
  index,
  deleteTool,
  toggleToolEncode,
}) => {
  const [associatingTerms, setAssociatingTerms] = useState(false);
  const [isEditing, setEditing] = useState(false);
  const [newUrl, setNewUrl] = useState(tool.url);
  const toggleAssociatingTerms = () => setAssociatingTerms(!associatingTerms)
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
              <footer className="blockquote-footer" contentEditable={isEditing} onChange={({target: {value}}) => setNewUrl(value)}>
                {tool.url}&nbsp;&nbsp;
                <FontAwesomeIcon icon="edit" onClick={() => setEditing(true)} />
              </footer>
              <Form.Check
                custom
                type="switch"
                id={`toggle-${tool.name.replace(' ', '')}-encode`}
                checked={tool.encode}
                onChange={() => toggleToolEncode(tool)}
                label="Encode Term as URI component"
              />
              { associatingTerms && <AssociateTerms tool={tool} /> }
              <Card.Link href="#" onClick={toggleAssociatingTerms}>
                Link Search Terms
              </Card.Link>
              <Card.Link href="#" onClick={() => {}}>
                Edit
              </Card.Link>
              <Card.Link style={{ color: 'red' }} href="#" onClick={() => deleteTool(tool)}>
                Delete <FontAwesomeIcon icon="trash" />
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
};