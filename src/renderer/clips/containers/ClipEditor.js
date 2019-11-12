import { connect } from 'react-redux';
import {
  clipModified,
  selectEditorLanguage,
  returnToNormalView,
} from '../actions';
import {
  clip,
  clipEditorLang,
  clipBeingViewed,
} from '../selectors';
import { ClipEditor } from '../components/ClipEditor';

const mapStateToProps = state => ({
  clip: clip(state, clipBeingViewed(state)),
  index: clipBeingViewed(state),
  language: clipEditorLang(state),
});

const mapDispatchToProps = {
  clipModified,
  selectEditorLanguage,
  returnToNormalView,
};

const container = connect(mapStateToProps, mapDispatchToProps)(ClipEditor);

export { container as ClipEditor };
