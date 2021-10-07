import { connect } from 'react-redux';
import { clip, clipIsLocked, showCopiedTooltip } from '../selectors';
import {
  toggleLock,
  clipModified,
  clipSelected,
  scanClipForTerms,
} from '../actions';
import { Clip } from '../components/Clip';

const mapStateToProps = (state, ownProps) => ({
  clip: clip(state, ownProps.index),
  isLocked: clipIsLocked(state, ownProps.index),
  showCopiedTooltip: showCopiedTooltip(state, ownProps.index),
});

const mapDispatchToProps = {
  scanClipForTerms,
  toggleLock,
  clipModified,
  clipSelected,
};

const container = connect(mapStateToProps, mapDispatchToProps)(Clip);

export { container as Clip };
