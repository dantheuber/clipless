import { connect } from 'react-redux';
import { viewingPreferences } from '../../preferences/selectors';
import { showTemplateSelection } from '../../preferences/compile-templates/selectors';
import { selectingQuickClips } from '../../preferences/quick-clip-launch/selectors';
import { Content } from '../components/Content';

const mapStateToProps = state => ({
  selectingQuickClips: selectingQuickClips(state),
  viewingPreferences: viewingPreferences(state),
  showTemplateSelection: showTemplateSelection(state),
});

const container = connect(mapStateToProps)(Content);

export { container as Content };
