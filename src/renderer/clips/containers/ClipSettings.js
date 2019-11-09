import { connect } from 'react-redux';
import {
  emptyClip,
  toggleLock,
  hideClipSettings,
  toggleClipSettings,
} from '../actions';
import { ClipSettings } from '../components/ClipSettings';
import { clipSettingsVisible } from '../selectors';

const mapStateToProps = (state, ownProps) => ({
  settingsVisible: clipSettingsVisible(state, ownProps.index),
})

const mapDispatchToProps = {
  emptyClip,
  toggleLock,
  hideClipSettings,
  toggleClipSettings,
};

const container = connect(mapStateToProps, mapDispatchToProps)(ClipSettings);

export { container as ClipSettings };