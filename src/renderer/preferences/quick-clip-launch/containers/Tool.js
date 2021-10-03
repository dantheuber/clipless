import { connect } from 'react-redux';
import { deleteTool, toggleToolEncode } from '../actions';
import { Tool } from '../components/Tool';

const mapDispatchToProps = {
  deleteTool,
  toggleToolEncode,
};

const container = connect(null, mapDispatchToProps)(Tool);

export { container as Tool };
