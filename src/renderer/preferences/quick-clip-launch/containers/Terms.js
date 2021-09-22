import { connect } from 'react-redux';
import { searchTerms } from '../selectors';
import { deleteTerm, createNewSearchTerm } from '../actions';
import { Terms } from '../components/Terms';

const mapStateToProps = state => ({
  searchTerms: searchTerms(state),
});

const mapDispatchToProps = {
  createNewSearchTerm,
  deleteTerm,
};

const container = connect(mapStateToProps, mapDispatchToProps)(Terms);

export { container as Terms };
