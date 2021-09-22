import { connect } from 'react-redux';
import {
  emptyClip,
  toggleLock,
  viewMultiLineEditor,
  scanClipForTerms,
} from '../actions';
import { ClipSettings } from '../components/ClipSettings';
import { clipIsLocked } from '../selectors';

const mapStateToProps = (state, ownProps) => ({
  clipIsLocked: clipIsLocked(state, ownProps.index),
});

const mapDispatchToProps = {
  scanClipForTerms,
  emptyClip,
  toggleLock,
  viewMultiLineEditor
};

const container = connect(mapStateToProps, mapDispatchToProps)(ClipSettings);

export { container as ClipSettings };
