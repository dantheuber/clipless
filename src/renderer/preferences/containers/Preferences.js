import { connect } from 'react-redux';
import {
  closePreferences,
} from '../actions';
import { viewingGeneralPrefs, viewingQuickClips, viewingTemplates } from '../selectors';
import { Preferences } from '../components/Preferences';

const mapStateToProps = state => ({
  viewingQuickClips: viewingQuickClips(state),
  viewingGeneralPrefs: viewingGeneralPrefs(state),
  viewingTemplates: viewingTemplates(state),
})

const mapDispatchToProps = {
  closePreferences,
};

const container = connect(mapStateToProps, mapDispatchToProps)(Preferences);

export { container as Preferences };
