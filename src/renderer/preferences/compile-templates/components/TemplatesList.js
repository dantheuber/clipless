import React from 'react';
import PropTypes from 'prop-types';
import ListGroup from 'react-bootstrap/ListGroup';
import { Template } from '../containers/Template';

export const TemplatesList = ({
  compileTemplates,
}) => (
  <ListGroup as="ol">
    { compileTemplates.map((template, index) => (
      <Template template={template} index={index} key={template.id} />
    ))}
  </ListGroup>
);
TemplatesList.propTypes = {
  compileTemplates: PropTypes.arrayOf(PropTypes.object).isRequired,
};