import { connect } from 'react-redux';
import { viewingClipEditor } from '../selectors';
import { Clips } from '../components/Clips';

const mapStateToProps = state => ({
  viewingClipEditor: viewingClipEditor(state),
});

const container = connect(mapStateToProps)(Clips);

export { container as Clips };
