import { connect } from 'react-redux';
import { clip, clipIsLocked } from '../selectors';
import { toggleLock } from '../actions';
import { Clip } from '../components/Clip';

const mapStateToProps = (state, ownProps) => ({
  clip: clip(state, ownProps.index),
  isLocked: clipIsLocked(state, ownProps.index),
});

const mapDispatchToProps = {
  toggleLock,
};

const container = connect(mapStateToProps, mapDispatchToProps)(Clip);

export { container as Clip };
