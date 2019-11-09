import { connect } from 'react-redux';
import { menuVisible } from '../selectors';
import { toggleMenu, hideMenu } from '../actions';
import { Header } from '../components/Header';

const mapStateToProps = state => ({
  menuVisible: menuVisible(state),
});

const mapDispatchToProps = {
  toggleMenu,
  hideMenu,
};

const container = connect(mapStateToProps, mapDispatchToProps)(Header);

export { container as Header };
