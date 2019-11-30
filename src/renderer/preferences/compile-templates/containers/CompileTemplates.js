import { connect } from 'react-redux';
import { createNewTemplate, handleDragAndDrop } from '../actions';
import { CompileTemplates } from '../components/CompileTemplates';

const mapDispatchToProps = {
  createNewTemplate,
  handleDragAndDrop,
};

const container = connect(null, mapDispatchToProps)(CompileTemplates);

export { container as CompileTemplates };
