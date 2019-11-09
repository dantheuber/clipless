import { connect } from 'react-redux';
import { toggleLock, toggleClipSettings } from '../actions';
import { ClipSettings } from '../components/ClipSettings';
import { clipSettingsVisible } from '../selectors';

const mapStateToProps = (state, ownProps) => ({
  settingsVisible: clipSettingsVisible(state, ownProps.index),
})

const mapDispatchToProps = {
  toggleClipSettings,
  toggleLock,
};

const container = connect(mapStateToProps, mapDispatchToProps)(ClipSettings);

export { container as ClipSettings };
