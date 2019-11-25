import { connect } from 'react-redux';
import { viewingClipEditor } from '../selectors';
import { Clips } from '../components/Clips';
import { numberOfClips } from '../../preferences/selectors';

const mapStateToProps = state => ({
  viewingClipEditor: viewingClipEditor(state),
  numberOfClips: numberOfClips(state),
});

const container = connect(mapStateToProps)(Clips);

export { container as Clips };
