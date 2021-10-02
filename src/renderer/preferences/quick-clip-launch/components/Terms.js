import React, { useState } from 'react';
import PropTypes from 'prop-types';
import ListGroup from 'react-bootstrap/ListGroup';
import InputGroup from 'react-bootstrap/InputGroup';
import Form from 'react-bootstrap/Form';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import Dropdown from 'react-bootstrap/Dropdown';
import * as regexOptions from '../regex_lib';
import {
  DEFAULT_NEW_TERM_NAME,
  DEFAULT_NEW_TERM_REGEX,
} from '../constants';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export const Terms = ({
  createNewSearchTerm,
  searchTerms,
  deleteTerm,
}) => {
  const [createTerm, setCreateTerm] = useState(false);
  const [newTermName, setNewTermName] = useState('');
  const [newTermRegex, setNewTermRegex] = useState(DEFAULT_NEW_TERM_REGEX);
  const termNameExists = () => searchTerms.reduce((acc, t) => {
    if (t.name.toLowerCase() === newTermName.toLowerCase()) {
      return true;
    }
    return acc;
  }, false);

  const termNameIsValid = () => newTermName !== '' && !termNameExists();

  const isRegexInvalid = () => {
    let termRegexError = false;
    try {
      new RegExp(newTermRegex, 'g');
      termRegexError = false;
    } catch (e) {
      console.log(e);
      termRegexError = true;
    }
    return termRegexError;
  };
  const isFormInvalid = () => isRegexInvalid() || newTermName === '' || termNameExists();
  const resetNewForm = () => {
    setNewTermName(DEFAULT_NEW_TERM_NAME);
    setNewTermRegex(DEFAULT_NEW_TERM_REGEX);
    setCreateTerm(false);
  };
  return (
    <ListGroup variant="flush">
      { !createTerm && 
        <Button style={{ padding: '3px' }} onClick={() => setCreateTerm(true)}>Create New Search Term</Button>
      }
      { createTerm &&
        <ListGroup.Item>
          <Form>
            <Form.Group>
              <Form.Label>New Search Term Name</Form.Label>
              <InputGroup hasValidation>
                <Form.Control
                  required
                  isInvalid={termNameExists()}
                  isValid={termNameIsValid()}
                  type='text'
                  value={newTermName}
                  onChange={({ target: { value }}) => setNewTermName(value) }
                />
                <Form.Control.Feedback type="invalid">A Search Term with that name already exists.</Form.Control.Feedback>
              </InputGroup>
            </Form.Group>
            <Form.Group>
              <Form.Label>
                New Search Regex&nbsp;
                <Dropdown style={{ float: 'right' }} size="sm">
                  <Dropdown.Toggle
                    size="sm"
                    style={{float:'right'}}
                    variant="success"
                    id="dropdown-basic"
                  >
                    Select from library
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    { Object.keys(regexOptions).map(key => (
                      <Dropdown.Item key={key} onClick={() => setNewTermRegex(regexOptions[key])}>
                        {key}
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown>
              </Form.Label>
              <InputGroup hasValidation>
                <Form.Control
                  required
                  isInvalid={isRegexInvalid()}
                  as="input"
                  type="text"
                  value={newTermRegex}
                  onChange={({ target: { value }}) => setNewTermRegex(value) }
                />
                <Form.Control.Feedback type="invalid">Invalid Regular Expression</Form.Control.Feedback>
              </InputGroup>
            </Form.Group>
          </Form>
          <Button
            size="sm"
            disabled={isFormInvalid()}
            onClick={() => {
              createNewSearchTerm({ name: newTermName, regex: newTermRegex });
              setNewTermName(DEFAULT_NEW_TERM_NAME);
              setNewTermRegex(DEFAULT_NEW_TERM_REGEX);
              setCreateTerm(false);
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
        </ListGroup.Item>
      }
      { !createTerm && searchTerms.map(term => (
        <ListGroup.Item style={{ padding: '.2rem' }} key={term.name}>
          <Card style={{ margin: '0', padding: '0'}}>
            <Card.Body>
              <Card.Title>{term.name}</Card.Title>
              <footer className="blockquote-footer">{term.regex}</footer>
              <Card.Link href="#" style={{ color: 'red' }} onClick={() => deleteTerm(term)}>
                Delete <FontAwesomeIcon icon="trash" />
              </Card.Link>
            </Card.Body>
          </Card>
        </ListGroup.Item>
      ))}
    </ListGroup>
  );
};

Terms.propTypes = {
  searchTerms: PropTypes.arrayOf(PropTypes.object).isRequired,
  createNewSearchTerm: PropTypes.func.isRequired,
  deleteTerm: PropTypes.func.isRequired,
};