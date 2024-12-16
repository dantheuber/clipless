import { connect } from 'react-redux';
import {
  clipModified,
  returnToNormalView,
} from '../actions';
import {
  clip,
  clipBeingViewed,
} from '../selectors';
import { ClipEditor } from '../components/ClipEditor';

const mapStateToProps = state => ({
  clip: clip(state, clipBeingViewed(state)),
  index: clipBeingViewed(state),
});

const mapDispatchToProps = {
  clipModified,
  returnToNormalView,
};

const container = connect(mapStateToProps, mapDispatchToProps)(ClipEditor);

export { container as ClipEditor };
