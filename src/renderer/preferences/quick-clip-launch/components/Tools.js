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

export const Tools = ({
  createNewTool,
  deleteTool,
  tools,
}) => {
  const [associatingTerms, setAssociatingTerms] = useState(false);
  const [associateToolIndex, setAssociateToolIndex] = useState(null);
  const [createTool, setCreateTool] = useState(false);
  const [newToolName, setNewToolName] = useState(DEFAULT_NEW_TOOL_NAME);
  const [newToolUrl, setNewToolUrl] = useState(DEFAULT_NEW_TOOL_URL);
  const toolNameExists = () => tools.reduce((acc, t) => {
    if (t.name === newToolName) {
      return true;
    }
    return acc;
  }, false);
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
    <ListGroup>
      { tools.map((tool, i) => (
        <ListGroup.Item style={{ color: 'black' }} key={tool.name}>
          {tool.name}: {tool.url}
          <ButtonGroup>
            <Button onClick={() => {
              setAssociateToolIndex(i);
              setAssociatingTerms(true);
            }}>
              Link Terms
            </Button>
            <Button onClick={() => deleteTool(tool)}>
              Delete
            </Button>
          </ButtonGroup>
        </ListGroup.Item>
      ))}
    { createTool &&
      <ListGroup.Item>
        <InputGroup hasValidation>
          <InputGroup.Text>Name</InputGroup.Text>
          <Form.Control
            required
            type='text'
            value={newToolName}
            onChange={({ target: { value }}) => setNewToolName(value) }
          />
          <Form.Control.Feedback type="invalid">Tool with that name already exists</Form.Control.Feedback>
        </InputGroup>
        <InputGroup>
          <InputGroup.Text>URL</InputGroup.Text>
          <Form.Control type='text' value={newToolUrl} onChange={({ target: { value }}) => setNewToolUrl(value) }/>
        </InputGroup>
        <Button
          disabled={toolNameExists()}
          onClick={() => {
            createNewTool({ name: newToolName, url: newToolUrl });
            setNewToolName(DEFAULT_NEW_TOOL_NAME);
            setNewToolUrl(DEFAULT_NEW_TOOL_URL);
            setCreateTool(false);
          }}
        >
          Done
        </Button>
      </ListGroup.Item>
    }
    { !createTool &&
      <Button onClick={() => setCreateTool(true)}>+</Button>
    }
    </ListGroup>
  );
};

Tools.propTypes = {
  createNewTool: PropTypes.func.isRequired,
  deleteTool: PropTypes.func.isRequired,
  tools: PropTypes.arrayOf(PropTypes.object).isRequired,
};