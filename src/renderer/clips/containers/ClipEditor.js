import { connect } from 'react-redux';
import {
  clipModified,
  returnToNormalView,
} from '../actions';
import { clipBeingViewed, clip } from '../selectors';
import { ClipEditor } from '../components/ClipEditor';

const mapStateToProps = state => ({
  index: clipBeingViewed(state),
  clip: clip(state, clipBeingViewed(state)),
});

const mapDispatchToProps = {
  clipModified,
  returnToNormalView,
};

const container = connect(mapStateToProps, mapDispatchToProps)(ClipEditor);

export { container as ClipEditor };
