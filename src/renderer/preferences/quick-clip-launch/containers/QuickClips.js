import { connect } from 'react-redux';
import {
  createNewTool,
  createNewSearchTerm,
} from '../actions';
import {
  searchTerms,
  tools
} from '../selectors';
import { QuickClips } from '../components/QuickClips';

const mapStateToProps = state => ({
  searchTerms: searchTerms(state),
  tools: tools(state),
});
const mapDispatchToProps = {
  createNewTool,
  createNewSearchTerm,
};

const container = connect(mapStateToProps, mapDispatchToProps)(QuickClips);

export { container as QuickClips };
