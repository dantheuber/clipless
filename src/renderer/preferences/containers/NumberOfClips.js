import { connect } from 'react-redux';
import { numberOfClips } from '../selectors';
import { setNumberOfClips } from '../actions';
import { NumberOfClips } from '../components/NumberOfClips';

const mapStateToProps = state => ({
  numberOfClips: numberOfClips(state),
});

const mapDispatchToProps = {
  setNumberOfClips,
};

const container = connect(mapStateToProps, mapDispatchToProps)(NumberOfClips);

export { container as NumberOfClips };
