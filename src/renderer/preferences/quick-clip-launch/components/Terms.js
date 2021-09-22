import React, { useState } from 'react';
import PropTypes from 'prop-types';
import ListGroup from 'react-bootstrap/ListGroup';
import InputGroup from 'react-bootstrap/InputGroup';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Dropdown from 'react-bootstrap/Dropdown';
import * as regexOptions from '../regex_lib';
import {
  DEFAULT_NEW_TERM_NAME,
  DEFAULT_NEW_TERM_REGEX,
} from '../constants';

export const Terms = ({
  createNewSearchTerm,
  searchTerms,
  deleteTerm,
}) => {
  const [createTerm, setCreateTerm] = useState(false);
  const [newTermName, setNewTermName] = useState('');
  const [newTermRegex, _setNewTermRegex] = useState(DEFAULT_NEW_TERM_REGEX);
  let termRegexError = false;
  const setNewTermRegex = (str) => {
    try {
      new RegExp(str, 'g');
      termRegexError = false;
    } catch (e) {
      termRegexError = true;
    }
    _setNewTermRegex(str);
  };
  return (
    <ListGroup>
      { searchTerms.map(term => (
        <ListGroup.Item key={term.name} style={{ color: 'black' }}>
          {term.name}: {`${term.regex}`}
          <Button onClick={() => deleteTerm(term)}>Delete</Button>
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
            <Dropdown>
              <Dropdown.Toggle variant="success" id="dropdown-basic">
                Choose Existing Regex
              </Dropdown.Toggle>

              <Dropdown.Menu>
                { Object.keys(regexOptions).map(key => (
                  <Dropdown.Item key={key} onClick={() => setNewTermRegex(regexOptions[key])}>
                    {key}
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown>
          </InputGroup>
          <Form.Control
              required
              as="input"
              type='text'
              value={newTermRegex}
              onChange={({ target: { value }}) => setNewTermRegex(value) }
            />
            { termRegexError && <Form.Control.Feedback>Invalid Regex</Form.Control.Feedback> }
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
  );
};

Terms.propTypes = {
  searchTerms: PropTypes.arrayOf(PropTypes.object).isRequired,
  createNewSearchTerm: PropTypes.func.isRequired,
  deleteTerm: PropTypes.func.isRequired,
};