import React, { useState } from 'react';
import PropTypes from 'prop-types';
import InputGroup from 'react-bootstrap/InputGroup';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import ListGroup from 'react-bootstrap/ListGroup';
import Row from 'react-bootstrap/Row';
import Container from 'react-bootstrap/Container';
import { AssociateTerms } from '../containers/AssociateTerms';

const DEFAULT_NEW_TOOL_NAME = '';
const DEFAULT_NEW_TOOL_URL = 'http://example.com?query={searchTerm}';
const DEFAULT_NEW_TERM_NAME = '';
const DEFAULT_NEW_TERM_REGEX = '\s(?<twitter_handle>\@[a-zA-Z0-9]+)\s';

export const QuickClips = ({
  searchTerms,
  tools,
  createNewTool,
  createNewSearchTerm,
}) => {
  const [viewTools, setViewTools] = useState(false);
  const [createTool, setCreateTool] = useState(false);
  const [viewTerms, setViewTerms] = useState(false);
  const [createTerm, setCreateTerm] = useState(false);
  const [associatingTerms, setAssociatingTerms] = useState(false);
  const [associateTool, setAssociateTool] = useState(null);
  const [newToolName, setNewToolName] = useState(DEFAULT_NEW_TOOL_NAME);
  const [newToolUrl, setNewToolUrl] = useState(DEFAULT_NEW_TOOL_URL);

  const [newTermName, setNewTermName] = useState(DEFAULT_NEW_TERM_NAME);
  const [newTermRegex, _setNewTermRegex] = useState(DEFAULT_NEW_TERM_REGEX);
  let termRegexError = false;
  const setNewTermRegex = (str) => {
    try {
      new RegExp(str, g);
      termRegexError = false;
    } catch (e) {
      termRegexError = true;
    }
    _setNewTermRegex(str);
  };
  const toolNameExists = () => tools.reduce((i, acc) => {
    if (i.name === newToolName) {
      return true;
    }
    return acc;
  }, false);
  if (associatingTerms) {
    return <AssociateTerms
      tool={associateTool}
      done={() => {
        setAssociateTool(null);
        setAssociatingTerms(false)
      }}
    />
  }
  return (
    <Container>
      <Row onClick={() => setViewTools(!viewTools)}>
        ({tools.length}) Tools
      </Row>
      { viewTools && (
        <ListGroup>
          { tools.map(tool => (
            <ListGroup.Item style={{ color: 'black' }} key={tool.name}>
              {tool.name}: {tool.url} <Button onClick={() => {
                setAssociateTool(tool);
                setAssociatingTerms(true);
              }}>Associate Terms</Button>
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
      )}
      <Row onClick={() => setViewTerms(!viewTerms)}>
        ({searchTerms.length}) Terms
      </Row>
      { viewTerms && (
        <ListGroup>
          { searchTerms.map(term => (
            <ListGroup.Item key={term.name} style={{ color: 'black' }}>
              {term.name}: {term.regex}
            </ListGroup.Item>
          ))}
          { createTerm &&
            <ListGroup.Item>
              <InputGroup>
                <InputGroup.Text>Name</InputGroup.Text>
                <Form.Control
                  required
                  type='text'
                  value={newTermName}
                  onChange={({ target: { value }}) => setNewTermName(value) }
                />
              </InputGroup>
              <InputGroup>
                <InputGroup.Text>Regex</InputGroup.Text>
                <Form.Control
                  required
                  type='text'
                  value={newTermRegex}
                  onChange={({ target: { value }}) => setNewTermRegex(value) }
                />
                { termRegexError && <Form.Control.Feedback>Invalid Regex</Form.Control.Feedback> }
              </InputGroup>
              <Button
                disabled={termRegexError}
                onClick={() => {
                  createNewSearchTerm({ name: newTermName, regex: newTermRegex });
                  setNewTermName(DEFAULT_NEW_TERM_NAME);
                  setNewTermRegex(DEFAULT_NEW_TERM_REGEX);
                  setCreateTerm(false);
                }}
              >
                Done
              </Button>
            </ListGroup.Item>
          }
          { !createTerm && 
            <Button onClick={() => setCreateTerm(true)}>+</Button>
          }
        </ListGroup>
      )}
    </Container>
  );
};

QuickClips.propTypes = {
  searchTerms: PropTypes.arrayOf(PropTypes.object).isRequired,
  tools: PropTypes.arrayOf(PropTypes.object).isRequired,
  createNewTool: PropTypes.func.isRequired,
  createNewSearchTerm: PropTypes.func.isRequired,
};
