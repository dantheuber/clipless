import { connect } from 'react-redux';
import { transparent, opacity } from '../selectors';
import { toggleTransparent, setOpacity } from '../actions';
import { Transparent } from '../components/Transparent';

const mapStateToProps = state => ({
  transparent: transparent(state),
  opacity: opacity(state),
});

const mapDispatchToProps = {
  toggleTransparent,
  setOpacity,
};

const container = connect(mapStateToProps, mapDispatchToProps)(Transparent);

export { container as Transparent };
