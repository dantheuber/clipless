import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import ListGroup from 'react-bootstrap/ListGroup';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

export const AssociateTerms = ({
  tool,
  searchTerms,
  associateTerm,
  done,
}) => {
  const isAssociatedWithTool = ({ name }) => tool.terms && tool.terms[name];
  const onTermClick = ({ name }) => {
    let newVal = true;
    if (tool.terms) {
      newVal = !tool.terms[name];
    }
    associateTerm({
      tool,
      term: {
        [name]: newVal,
      },
    });
  };
  return (
    <Form>
      <Button inline size="sm" onClick={done}>Back</Button>
      <Form.Text>
        Use <strong>{tool.name}</strong> with the following search terms:
      </Form.Text>
      { searchTerms.map(term => (
        <Form.Check
          custom
          inline
          id={`associateWith-${term.name.replace(' ', '')}`}
          type="checkbox"
          checked={isAssociatedWithTool(term)}
          key={term.name}
          onChange={() => onTermClick(term)}
          label={term.name}
        />
      ))}
    </Form>
  );
};

AssociateTerms.propTypes = {
  tool: PropTypes.object.isRequired,
  searchTerms: PropTypes.arrayOf(PropTypes.object).isRequired,
  associateTerm: PropTypes.func.isRequired,
  done: PropTypes.func.isRequired,
};