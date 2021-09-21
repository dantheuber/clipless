import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Row from 'react-bootstrap/Row';
import Button from 'react-bootstrap/Button';
import ListGroup from 'react-bootstrap/ListGroup';
import Container from 'react-bootstrap/Container';

export const QuickClipSelection = ({
  availableTools,
  selectTerm,
  unselectTerm,
  selectTool,
  unselectTool,
  launchSelected,
  cancelSelection,
  matchedTerms,
  selectedTools,
  selectedTerms,
}) => (
  <Container>
    <Row>
      Select Matched Terms: ({selectedTerms.length})
      <ListGroup>
        { matchedTerms.map((term, i) => { 
          const active = selectedTerms.includes(term);
          return (
            <ListGroup.Item
              key={`term-${i}-${term.match}`}
              style={{ color: active ? 'white':'black' }}
              active={active}
              onClick={() => active ? unselectTerm(term) : selectTerm(term)}
            >
              {term.match}
            </ListGroup.Item>
          );
        })}
      </ListGroup>
    </Row>
    <Row>
      Select Tools: ({selectedTools.length})
      <ListGroup>
        { availableTools.map((tool, i) => {
          const active = selectedTools.reduce((acc, t) => t.name === tool.name ? true : acc, false);
          return (
            <ListGroup.Item
              key={`tool-${i}-${tool.name}`}
              style={{ color: active ? 'white':'black' }}
              active={active}
              onClick={() => active ? unselectTool(tool) : selectTool(tool)}
            >
              {tool.name}
            </ListGroup.Item>
          );
        })}
      </ListGroup>
    </Row>
    <Row>
      <Button onClick={launchSelected}>Launch Selected</Button>
      <Button onClick={cancelSelection}>Cancel</Button>
    </Row>
  </Container>
);

QuickClipSelection.propTypes = {
  selectTerm: PropTypes.func.isRequired,
  unselectTerm: PropTypes.func.isRequired,
  selectTool: PropTypes.func.isRequired,
  unselectTool: PropTypes.func.isRequired,
  launchSelected: PropTypes.func.isRequired,
  cancelSelection: PropTypes.func.isRequired,
  toolIsSelected: PropTypes.func.isRequired,
  termIsSelected: PropTypes.func.isRequired,
  availableTools: PropTypes.arrayOf(PropTypes.object).isRequired,
  selectedTools: PropTypes.arrayOf(PropTypes.object).isRequired,
  selectedTerms: PropTypes.arrayOf(PropTypes.object).isRequired,
  matchedTerms: PropTypes.arrayOf(PropTypes.object).isRequired,
};
