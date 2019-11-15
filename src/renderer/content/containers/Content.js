import { connect } from 'react-redux';
import { viewingPreferences } from '../../preferences/selectors';
import { Content } from '../components/Content';

const mapStateToProps = state => ({
  viewingPreferences: viewingPreferences(state),
});

const container = connect(mapStateToProps)(Content);

export { container as Content };
