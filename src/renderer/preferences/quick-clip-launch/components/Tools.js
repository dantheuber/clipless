import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { DragDropContext, Droppable } from 'react-beautiful-dnd';
import ListGroup from 'react-bootstrap/ListGroup';
import InputGroup from 'react-bootstrap/InputGroup';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  DEFAULT_NEW_TOOL_NAME,
  DEFAULT_NEW_TOOL_URL,
} from '../constants';
import { AssociateTerms } from '../containers/AssociateTerms';
import { Tool } from '../containers/Tool';

export const Tools = ({
  handleDragAndDrop,
  createNewTool,
  tools,
}) => {
  const [associatingTerms, setAssociatingTerms] = useState(false);
  const [associateToolIndex, setAssociateToolIndex] = useState(null);
  const [createTool, setCreateTool] = useState(false);
  const [newToolName, setNewToolName] = useState(DEFAULT_NEW_TOOL_NAME);
  const [newToolUrl, setNewToolUrl] = useState(DEFAULT_NEW_TOOL_URL);
  const [newToolEncode, setNewToolEncode] = useState(true);
  
  const resetNewForm = () => {
    setCreateTool(false);
    setNewToolName(DEFAULT_NEW_TOOL_NAME);
    setNewToolUrl(DEFAULT_NEW_TOOL_URL);
    setNewToolEncode(true);
  };

  const toolNameExists = () => tools.reduce((acc, t) => {
    if (t.name.toLowerCase() === newToolName.toLowerCase()) {
      return true;
    }
    return acc;
  }, false);
  const isNewToolNameValid = () => !toolNameExists() && newToolName !== '';
  const newToolUrlIsValid = () => newToolUrl !== '' && /\{[a-zA-Z0-9]+\}/g.exec(newToolUrl);
  const formIsInvalid = () => !isNewToolNameValid() || !newToolUrlIsValid();

  if (associatingTerms) {
    return <AssociateTerms
      tool={tools[associateToolIndex]}
      done={() => {
        setAssociateToolIndex(null);
        setAssociatingTerms(false)
      }}
    />
  }
  return (
    <ListGroup variant="flush">
      { !createTool &&
        <Button style={{ padding: '3px' }} onClick={() => setCreateTool(true)}>Create New Tool</Button>
      }
      { createTool &&
      <ListGroup.Item>
        <Form>
          <Form.Group>
            <Form.Label>New Tool Name</Form.Label>
            <InputGroup hasValidation>
              <Form.Control
                isInvalid={toolNameExists()}
                isValid={isNewToolNameValid()}
                size="sm"
                required
                type='text'
                value={newToolName}
                onChange={({ target: { value }}) => setNewToolName(value) }
              />
              <Form.Control.Feedback type="invalid">A tool with that name already exists!</Form.Control.Feedback>
            </InputGroup>
          </Form.Group>
          <Form.Group>
            <Form.Label>New Tool URL</Form.Label>
            <InputGroup hasValidation>
              <Form.Control
                size="sm"
                type='text'
                isInvalid={!newToolUrlIsValid()}
                isValid={newToolUrlIsValid()}
                placeholder={DEFAULT_NEW_TOOL_URL}
                value={newToolUrl}
                onChange={({ target: { value }}) => setNewToolUrl(value) }
              />
              <Form.Control.Feedback type="invalid">Your URL must contain a <code>{'{groupName}'}</code> token where the named capture group of the same name will be passed as a query string parameter.</Form.Control.Feedback>
            </InputGroup>
            <Form.Check
              custom
              type="switch"
              id="encode-new-tool"
              checked={newToolEncode}
              label="Encode searchTerm as URI Component"
              onChange={() => setNewToolEncode(!newToolEncode)}
            />
          </Form.Group>
          <Button
            size="sm"
            disabled={formIsInvalid()}
            onClick={() => {
              createNewTool({
                name: newToolName,
                url: newToolUrl,
                encode: newToolEncode
              });
              resetNewForm();
            }}
          >
            Done
          </Button>
          <Button
            size="sm"
            variant="outline-secondary"
            onClick={resetNewForm}
          >
            Cancel
          </Button>
        </Form>
      </ListGroup.Item>
    }
    <DragDropContext onDragEnd={handleDragAndDrop}>
      <Droppable droppableId="tools">
        {provided => (
          <div ref={provided.innerRef} {...provided.droppableProps}>
            { tools.map((tool, i) => <Tool key={tool.name.replace(' ', '')} index={i} tool={tool} />) }
          </div>
        )}
      </Droppable>
    </DragDropContext>
    </ListGroup>
  );
};

Tools.propTypes = {
  createNewTool: PropTypes.func.isRequired,
  handleDragAndDrop: PropTypes.func.isRequired,
  tools: PropTypes.arrayOf(PropTypes.object).isRequired,
};