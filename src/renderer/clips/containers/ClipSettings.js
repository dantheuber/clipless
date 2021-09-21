import { connect } from 'react-redux';
import {
  emptyClip,
  toggleLock,
  hideClipSettings,
  toggleClipSettings,
  viewMultiLineEditor,
  scanClipForTerms,
} from '../actions';
import { ClipSettings } from '../components/ClipSettings';
import { clipSettingsVisible, clipIsLocked } from '../selectors';

const mapStateToProps = (state, ownProps) => ({
  settingsVisible: clipSettingsVisible(state, ownProps.index),
  clipIsLocked: clipIsLocked(state, ownProps.index),
});
const mapDispatchToProps = {
  scanClipForTerms,
  emptyClip,
  toggleLock,
  hideClipSettings,
  toggleClipSettings,
  viewMultiLineEditor
};

const container = connect(mapStateToProps, mapDispatchToProps)(ClipSettings);

export { container as ClipSettings };
