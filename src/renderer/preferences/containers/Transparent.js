import { connect } from 'react-redux';
import { transparent } from '../selectors';
import { toggleTransparent } from '../actions';
import { Transparent } from '../components/Transparent';

const mapStateToProps = state => ({
  transparent: transparent(state),
});

const mapDispatchToProps = {
  toggleTransparent,
};

const container = connect(mapStateToProps, mapDispatchToProps)(Transparent);

export { container as Transparent };
