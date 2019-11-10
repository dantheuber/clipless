import { connect } from 'react-redux';
import {
  clipModified,
  returnToNormalView,
} from '../actions';
import { MultiLineClipView } from '../components/MultiLineClipView';
import { clipBeingViewed, clip } from '../selectors';

const mapStateToProps = state => ({
  index: clipBeingViewed(state),
  clip: clip(state, clipBeingViewed(state)),
});

const mapDispatchToProps = {
  clipModified,
  returnToNormalView,
};

const container = connect(mapStateToProps, mapDispatchToProps)(MultiLineClipView);

export { container as MultiLineClipView };
