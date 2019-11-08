import { connect } from 'react-redux';
import { toggleLock } from '../actions';
import { ClipSettings } from '../components/ClipSettings';

const mapDispatchToProps = {
  toggleLock,
};

const container = connect(null, mapDispatchToProps)(ClipSettings);

export { container as ClipSettings };
