import React from 'react';
import PropTypes from 'prop-types';
import ListGroup from 'react-bootstrap/ListGroup';
import Card from 'react-bootstrap/Card';

export const TemplateSelection = ({
  compileTemplates,
  selectTemplate,
}) => (
  <ListGroup className="main" variant="flush">
    <ListGroup.Item variant="primary">
      Select Template
    </ListGroup.Item>
    { compileTemplates.map((template, index) => (
      <ListGroup.Item
        action
        tabIndex={index + 1}
        key={template.id}
        onClick={() => selectTemplate(template)}
      >
        <Card style={{margin:0, padding:0, border:0}} text>
          { template.name }
        </Card>
      </ListGroup.Item>
    ))}
  </ListGroup>
);
TemplateSelection.propTypes = {
  compileTemplates: PropTypes.arrayOf(PropTypes.object).isRequired,
  selectTemplate: PropTypes.func.isRequired,
};
