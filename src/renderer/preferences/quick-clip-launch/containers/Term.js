import { connect } from 'react-redux';
import { deleteTerm } from '../actions';
import { Term } from '../components/Term';

const mapDispatchToProps = {
  deleteTerm,
};

const container = connect(null, mapDispatchToProps)(Term);

export { container as Term };
