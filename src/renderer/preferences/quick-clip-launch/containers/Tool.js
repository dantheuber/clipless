import { connect } from 'react-redux';
import { toolAssociatedTermsCount } from '../selectors';
import {
  deleteTool,
  toggleToolEncode,
  updateToolUrl
} from '../actions';
import { Tool } from '../components/Tool';

const mapStateToProps = state => ({
  toolAssociatedTermsCount: toolAssociatedTermsCount(state)
});

const mapDispatchToProps = {
  deleteTool,
  toggleToolEncode,
  updateToolUrl
};

const container = connect(mapStateToProps, mapDispatchToProps)(Tool);

export { container as Tool };
