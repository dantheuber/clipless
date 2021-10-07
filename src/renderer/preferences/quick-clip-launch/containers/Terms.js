import { connect } from 'react-redux';
import { searchTerms } from '../selectors';
import {
  handleDragAndDrop,
  createNewSearchTerm,
} from '../actions';
import { Terms } from '../components/Terms';

const mapStateToProps = state => ({
  searchTerms: searchTerms(state),
});

const mapDispatchToProps = {
  handleDragAndDrop,
  createNewSearchTerm,
};

const container = connect(mapStateToProps, mapDispatchToProps)(Terms);

export { container as Terms };
