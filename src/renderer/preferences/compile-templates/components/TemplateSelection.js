import React from 'react';
import PropTypes from 'prop-types';

export const TemplateSelection = ({
  compileTemplates,
  selectTemplate,
}) => (
  <ol>
    { compileTemplates.map(template => (
      <li
        key={template.id}
        onClick={() => selectTemplate(template)}
      >
        { template.name }
      </li>
    ))}
  </ol>
);
TemplateSelection.propTypes = {
  compileTemplates: PropTypes.arrayOf(PropTypes.object).isRequired,
  selectTemplate: PropTypes.func.isRequired,
};
