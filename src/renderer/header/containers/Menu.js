import { connect } from 'react-redux';
import { emptyAllClips } from '../../clips/actions';
import { Menu } from '../components/Menu';

const mapDispatchToProps = { emptyAllClips };

const container = connect(null, mapDispatchToProps)(Menu);

export { container as Menu };