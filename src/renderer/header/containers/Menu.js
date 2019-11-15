import { connect } from 'react-redux';
import { quitApp } from '../actions';
import { emptyAllClips } from '../../clips/actions';
import { viewPreferences } from '../../preferences/actions';
import { Menu } from '../components/Menu';

const mapDispatchToProps = {
  viewPreferences,
  emptyAllClips,
  quitApp,
};

const container = connect(null, mapDispatchToProps)(Menu);

export { container as Menu };