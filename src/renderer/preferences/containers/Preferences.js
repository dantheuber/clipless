import { connect } from 'react-redux';
import { closePreferences } from '../actions';
import { Preferences } from '../components/Preferences';

const mapDispatchToProps = {
  closePreferences,
};

const container = connect(null, mapDispatchToProps)(Preferences);

export { container as Preferences };
