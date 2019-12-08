import { connect } from 'react-redux';
import {
  viewGeneralPrefs,
  viewTemplates,
} from '../actions';
import { viewingGeneralPrefs, viewingTemplates } from '../selectors';
import { Navigation } from '../components/Navigation';

const mapStateToProps = state => ({
  viewingGeneralPrefs: viewingGeneralPrefs(state),
  viewingTemplates: viewingTemplates(state),
})

const mapDispatchToProps = {
  viewGeneralPrefs,
  viewTemplates,
};

const container = connect(mapStateToProps, mapDispatchToProps)(Navigation);

export { container as Navigation };
