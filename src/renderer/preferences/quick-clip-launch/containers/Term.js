import { connect } from 'react-redux';
import { deleteTerm, updateTermRegex } from '../actions';
import { Term } from '../components/Term';

const mapDispatchToProps = {
  updateTermRegex,
  deleteTerm,
};

const container = connect(null, mapDispatchToProps)(Term);

export { container as Term };
