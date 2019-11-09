import { connect } from 'react-redux';
import { Menu } from '../components/Menu';

const mapDispatchToProps = { };

const container = connect(null, mapDispatchToProps)(Menu);

export { container as Menu };