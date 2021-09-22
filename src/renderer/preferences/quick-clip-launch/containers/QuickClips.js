import { connect } from 'react-redux';
import {
  createNewTool,
  deleteTool,
  toggleAutoScan,
} from '../actions';
import {
  autoScan,
  tools
} from '../selectors';
import { QuickClips } from '../components/QuickClips';

const mapStateToProps = state => ({
  autoScan: autoScan(state),
  tools: tools(state),
});
const mapDispatchToProps = {
  toggleAutoScan,
  createNewTool,
  deleteTool,
};

const container = connect(mapStateToProps, mapDispatchToProps)(QuickClips);

export { container as QuickClips };
