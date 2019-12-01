import React from 'react';
import PropTypes from 'prop-types';
import ListGroup from 'react-bootstrap/ListGroup';

export const TemplateSelection = ({
  compileTemplates,
  selectTemplate,
}) => (
  <ListGroup className="dark">
    { compileTemplates.map((template, index) => (
      <ListGroup.Item
        action
        variant="dark"
        tabIndex={index}
        key={template.id}
        onClick={() => selectTemplate(template)}
      >
        { template.name }
      </ListGroup.Item>
    ))}
  </ListGroup>
);
TemplateSelection.propTypes = {
  compileTemplates: PropTypes.arrayOf(PropTypes.object).isRequired,
  selectTemplate: PropTypes.func.isRequired,
};
