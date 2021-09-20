import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import ListGroup from 'react-bootstrap/ListGroup';
import Button from 'react-bootstrap/Button';

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
    <Container>
      <Row>
        <h3>{tool.name}</h3>
        Choose search terms to associate with this tool
        <Button onClick={done}>Done</Button>
      </Row>
      <Row>
        <ListGroup>
          { searchTerms.map(term => (
            <ListGroup.Item
              active={isAssociatedWithTool(term)}
              key={term.name}
              onClick={() => onTermClick(term)}
            >
              {term.name}
            </ListGroup.Item>
          ))}
        </ListGroup>
      </Row>
    </Container>
  );
};

AssociateTerms.propTypes = {
  tool: PropTypes.object.isRequired,
  searchTerms: PropTypes.arrayOf(PropTypes.object).isRequired,
  associateTerm: PropTypes.func.isRequired,
  done: PropTypes.func.isRequired,
};