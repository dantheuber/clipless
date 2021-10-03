import React from 'react';
import PropTypes from 'prop-types';
import Form from 'react-bootstrap/Form';

export const AssociateTerms = ({
  tool,
  searchTerms,
  associateTerm,
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