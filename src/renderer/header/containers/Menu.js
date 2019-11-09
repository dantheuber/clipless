import { connect } from 'react-redux';
import { quitApp } from '../actions';
import { emptyAllClips } from '../../clips/actions';
import { Menu } from '../components/Menu';

const mapDispatchToProps = {
  emptyAllClips,
  quitApp,
};

const container = connect(null, mapDispatchToProps)(Menu);

export { container as Menu };