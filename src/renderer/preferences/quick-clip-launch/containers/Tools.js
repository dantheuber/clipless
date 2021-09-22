import { connect } from 'react-redux';
import { searchTerms, tools } from '../selectors';
import { createNewTool, deleteTool } from '../actions';
import { Tools } from '../components/Tools';

const mapStateToProps = state => ({
  tools: tools(state)
});

const mapDispatchToProps = {
  createNewTool,
  deleteTool,
};

const container = connect(mapStateToProps, mapDispatchToProps)(Tools);

export { container as Tools };
