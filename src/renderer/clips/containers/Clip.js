import { connect } from 'react-redux';
import { clip, clipIsLocked } from '../selectors';
import { toggleLock, clipModified, clipSelected } from '../actions';
import { Clip } from '../components/Clip';

const mapStateToProps = (state, ownProps) => ({
  clip: clip(state, ownProps.index),
  isLocked: clipIsLocked(state, ownProps.index),
});

const mapDispatchToProps = {
  toggleLock,
  clipModified,
  clipSelected,
};

const container = connect(mapStateToProps, mapDispatchToProps)(Clip);

export { container as Clip };
