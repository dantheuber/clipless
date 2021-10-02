import { connect } from 'react-redux';
import {
  launchSelected,
  cancelSelection,
  selectTerm,
  selectTool,
  unselectTerm,
  unselectTool,
  launchAll
} from '../actions';
import {
  availableTools,
  selectedTerms,
  selectedTools,
  matchedTerms,
  searchTerms,
  tools,
  termIsSelected,
  toolIsSelected,
  
} from '../selectors';
import { QuickClipSelection } from '../components/QuickClipSelection';

const mapStateToProps = state => ({
  availableTools: availableTools(state),
  termIsSelected: termIsSelected(state),
  toolIsSelected: toolIsSelected(state),
  selectedTools: selectedTools(state),
  selectedTerms: selectedTerms(state),
  matchedTerms: matchedTerms(state),
  searchTerms: searchTerms(state),
  tools: tools(state),
});
const mapDispatchToProps = {
  launchSelected,
  cancelSelection,
  selectTerm,
  selectTool,
  unselectTerm,
  unselectTool,
  launchAll
};

const container = connect(mapStateToProps, mapDispatchToProps)(QuickClipSelection);

export { container as QuickClipSelection };
