import { connect } from 'react-redux';
import { clips } from '../selectors';
import { Clips } from '../components/Clips';

const mapStateToProps = state => ({
  clips: clips(state),
});

const container = connect(mapStateToProps)(Clips);

export { container as Clips };
