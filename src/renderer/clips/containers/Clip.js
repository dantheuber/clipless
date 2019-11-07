import { connect } from 'react-redux';
import { clip, clipIsLocked } from '../selectors';
import { toggleLock, clipModified } from '../actions';
import { Clip } from '../components/Clip';

const mapStateToProps = (state, ownProps) => ({
  clip: clip(state, ownProps.index),
  isLocked: clipIsLocked(state, ownProps.index),
});

const mapDispatchToProps = {
  toggleLock,
  clipModified,
};

const container = connect(mapStateToProps, mapDispatchToProps)(Clip);

export { container as Clip };
