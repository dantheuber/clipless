import { connect } from 'react-redux';
import {
  createNewTemplate,
  handleDragAndDrop,
  exportTemplates,
} from '../actions';
import { CompileTemplates } from '../components/CompileTemplates';

const mapDispatchToProps = {
  createNewTemplate,
  handleDragAndDrop,
  exportTemplates,
};

const container = connect(null, mapDispatchToProps)(CompileTemplates);

export { container as CompileTemplates };
