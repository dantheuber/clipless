import { connect } from 'react-redux';
import { alwaysOnTop } from '../selectors';
import { toggleAlwaysOnTop } from '../actions';
import { AlwaysOnTop } from '../components/AlwaysOnTop';

const mapStateToProps = state => ({
  alwaysOnTop: alwaysOnTop(state),
});

const mapDispatchToProps = {
  toggleAlwaysOnTop,
};

const container = connect(mapStateToProps, mapDispatchToProps)(AlwaysOnTop);

export { container as AlwaysOnTop };
