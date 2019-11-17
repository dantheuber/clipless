import { connect } from 'react-redux';
import { viewingPreferences, transparent } from '../../preferences/selectors';
import { Content } from '../components/Content';

const mapStateToProps = state => ({
  viewingPreferences: viewingPreferences(state),
  transparent: transparent(state),
});

const container = connect(mapStateToProps)(Content);

export { container as Content };
