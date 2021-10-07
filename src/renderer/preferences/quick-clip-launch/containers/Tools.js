import { connect } from 'react-redux';
import { tools } from '../selectors';
import {
  handleDragAndDrop,
  toggleToolEncode,
  createNewTool,
  deleteTool
} from '../actions';
import { Tools } from '../components/Tools';

const mapStateToProps = state => ({
  tools: tools(state)
});

const mapDispatchToProps = {
  createNewTool,
  deleteTool,
  toggleToolEncode,
  handleDragAndDrop,
};

const container = connect(mapStateToProps, mapDispatchToProps)(Tools);

export { container as Tools };
