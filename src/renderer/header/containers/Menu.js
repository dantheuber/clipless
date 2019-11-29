import { connect } from 'react-redux';
import { quitApp } from '../actions';
import { menuVisible } from '../selectors';
import { emptyAllClips } from '../../clips/actions';
import { viewPreferences } from '../../preferences/actions';
import { Menu } from '../components/Menu';

const mapStateToProps = state => ({
  menuVisible: menuVisible(state),
});

const mapDispatchToProps = {
  viewPreferences,
  emptyAllClips,
  quitApp,
};

const container = connect(mapStateToProps, mapDispatchToProps)(Menu);

export { container as Menu };