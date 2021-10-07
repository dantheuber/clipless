import { connect } from 'react-redux';
import {
  associateTerm,
} from '../actions';
import { searchTerms } from '../selectors';
import { AssociateTerms } from '../components/AssociateTerms';

const mapStateToProps = state => ({
  searchTerms: searchTerms(state),
});
const mapDispatchToProps = {
  associateTerm,
};

const container = connect(mapStateToProps, mapDispatchToProps)(AssociateTerms);

export { container as AssociateTerms };
