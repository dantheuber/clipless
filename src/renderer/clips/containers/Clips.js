import { connect } from 'react-redux';
import { viewingMultiLineEditor } from '../selectors';
import { Clips } from '../components/Clips';

const mapStateToProps = state => ({
  viewingMultiLineEditor: viewingMultiLineEditor(state),
});

const container = connect(mapStateToProps)(Clips);

export { container as Clips };
