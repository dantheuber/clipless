import { connect } from 'react-redux';
import {
  createNewTool,
  createNewSearchTerm,
  deleteTool,
  deleteTerm,
  toggleAutoScan,
} from '../actions';
import {
  autoScan,
  searchTerms,
  tools
} from '../selectors';
import { QuickClips } from '../components/QuickClips';

const mapStateToProps = state => ({
  autoScan: autoScan(state),
  searchTerms: searchTerms(state),
  tools: tools(state),
});
const mapDispatchToProps = {
  toggleAutoScan,
  createNewTool,
  createNewSearchTerm,
  deleteTool,
  deleteTerm,
};

const container = connect(mapStateToProps, mapDispatchToProps)(QuickClips);

export { container as QuickClips };
