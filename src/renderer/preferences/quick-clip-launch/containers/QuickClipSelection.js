import { connect } from 'react-redux';
import lifecycle from 'react-pure-lifecycle';
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

const methods = {
  componentWillMount(props) {
    if (props.matchedTerms.length === 1) {
      props.selectTerm(props.matchedTerms[0]);
    }
  }
}

const container = connect(mapStateToProps, mapDispatchToProps)(
  lifecycle(methods)(QuickClipSelection)
);

export { container as QuickClipSelection };
