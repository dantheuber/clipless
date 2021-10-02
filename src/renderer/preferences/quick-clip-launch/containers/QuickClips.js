import { connect } from 'react-redux';
import { toggleAutoScan } from '../actions';
import {
  autoScan,
  toolCount,
  searchTermCount,
} from '../selectors';
import { QuickClips } from '../components/QuickClips';

const mapStateToProps = state => ({
  autoScan: autoScan(state),
  toolCount: toolCount(state),
  searchTermCount: searchTermCount(state)
});
const mapDispatchToProps = {
  toggleAutoScan,
};

const container = connect(mapStateToProps, mapDispatchToProps)(QuickClips);

export { container as QuickClips };
