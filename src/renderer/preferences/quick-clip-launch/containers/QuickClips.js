import { connect } from 'react-redux';
import {
  addNewTool,
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
  addNewTool,
};

const container = connect(mapStateToProps, mapDispatchToProps)(QuickClips);

export { container as QuickClips };
