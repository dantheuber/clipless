import React, { useState } from 'react';
import PropTypes from 'prop-types';
import ListGroup from 'react-bootstrap/ListGroup';
import InputGroup from 'react-bootstrap/InputGroup';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Dropdown from 'react-bootstrap/Dropdown';
import { list as regexOptions } from '../regex_lib';
import {
  DEFAULT_NEW_TERM_NAME,
  DEFAULT_NEW_TERM_REGEX,
} from '../constants';
import { Term } from '../containers/Term';
import { DragDropContext, Droppable } from 'react-beautiful-dnd';

export const Terms = ({
  createNewSearchTerm,
  searchTerms,
  handleDragAndDrop
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
                    { regexOptions.map((option) => (
                      <Dropdown.Item className="regex-option" key={option.label} onClick={() => setNewTermRegex(option.regex)}>
                        {option.label}
                        <footer className="blockquote-footer">Example: {option.example}</footer>
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
      <DragDropContext onDragEnd={handleDragAndDrop}>
        <Droppable droppableId="terms">
          {provided => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              { searchTerms.map((term, i) => <Term term={term} index={i} key={term.name.replace(' ', '')} />) }
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </ListGroup>
  );
};

Terms.propTypes = {
  createNewSearchTerm: PropTypes.func.isRequired,
  handleDragAndDrop: PropTypes.func.isRequired,
  searchTerms: PropTypes.arrayOf(PropTypes.object).isRequired,
};