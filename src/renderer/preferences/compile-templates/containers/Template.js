import { connect } from 'react-redux';
import {
  deleteTemplate,
  updateTemplateName,
  updateTemplateContent,
} from '../actions';
import { Template } from '../components/Template';

const mapDispatchToProps = {
  deleteTemplate,
  updateTemplateName,
  updateTemplateContent,
};

const container = connect(null, mapDispatchToProps)(Template);

export { container as Template };
