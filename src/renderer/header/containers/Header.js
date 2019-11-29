import { connect } from 'react-redux';
import { toggleMenu } from '../actions';
import { Header } from '../components/Header';

const mapDispatchToProps = {
  toggleMenu,
};

const container = connect(null, mapDispatchToProps)(Header);

export { container as Header };
