import React, { useState } from 'react';
import PropTypes from 'prop-types';
import ListGroup from 'react-bootstrap/ListGroup';
import InputGroup from 'react-bootstrap/InputGroup';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import {
  DEFAULT_NEW_TOOL_NAME,
  DEFAULT_NEW_TOOL_URL,
} from '../constants';
import { AssociateTerms } from '../containers/AssociateTerms';
import Card from 'react-bootstrap/Card';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export const Tools = ({
  toggleToolEncode,
  createNewTool,
  deleteTool,
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
  const newToolUrlIsValid = () => newToolUrl !== '' && newToolUrl.search('{searchTerm}') > 0;
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
              <Form.Control.Feedback type="invalid">Your URL must contain <code>{'{searchTerm}'}</code> where the matched term will be passed as a query string parameter.</Form.Control.Feedback>
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
              createNewTool({ name: newToolName, url: newToolUrl, encode: newToolEncode });
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
    { !createTool && tools.map((tool, i) => (
      <ListGroup.Item style={{ padding: '.2rem', color: 'black' }} key={tool.name}>
        <Card style={{ margin: '0', padding: '0'}}>
          <Card.Body>
            <Card.Title>
              {tool.name}
            </Card.Title>
            <footer className="blockquote-footer">{tool.url}</footer>
            <Form.Check
              custom
              type="switch"
              id={`toggle-${tool.name.replace(' ', '')}-encode`}
              checked={tool.encode}
              onChange={() => toggleToolEncode(tool)}
              label="Encode Term as URI component"
            />
            <Card.Link href="#" onClick={() => {
              setAssociateToolIndex(i);
              setAssociatingTerms(true);
            }}>
              Link Search Terms
            </Card.Link>
            <Card.Link style={{ color: 'red' }} href="#" onClick={() => deleteTool(tool)}>
              Delete <FontAwesomeIcon icon="trash" />
            </Card.Link>
          </Card.Body>
        </Card>
      </ListGroup.Item>
    ))}
    </ListGroup>
  );
};

Tools.propTypes = {
  createNewTool: PropTypes.func.isRequired,
  deleteTool: PropTypes.func.isRequired,
  toggleToolEncode: PropTypes.func.isRequired,
  tools: PropTypes.arrayOf(PropTypes.object).isRequired,
};