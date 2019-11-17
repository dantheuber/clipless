import { connect } from 'react-redux';
import { emptyLockedClips } from '../selectors';
import { toggleEmptyLockedClips } from '../actions';
import { EmptyLockedClips } from '../components/EmptyLockedClips';

const mapStateToProps = state => ({
  emptyLockedClips: emptyLockedClips(state),
});

const mapDispatchToProps = {
  toggleEmptyLockedClips,
};

const container = connect(mapStateToProps, mapDispatchToProps)(EmptyLockedClips);

export { container as EmptyLockedClips };
