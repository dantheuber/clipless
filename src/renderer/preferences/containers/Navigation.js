import { connect } from 'react-redux';
import {
  viewGeneralPrefs,
  viewTemplates,
  viewQuickClips,
} from '../actions';
import { viewingGeneralPrefs, viewingQuickClips, viewingTemplates } from '../selectors';
import { Navigation } from '../components/Navigation';

const mapStateToProps = state => ({
  viewingGeneralPrefs: viewingGeneralPrefs(state),
  viewingTemplates: viewingTemplates(state),
  viewingQuickClips: viewingQuickClips(state),
})

const mapDispatchToProps = {
  viewGeneralPrefs,
  viewTemplates,
  viewQuickClips,
};

const container = connect(mapStateToProps, mapDispatchToProps)(Navigation);

export { container as Navigation };
