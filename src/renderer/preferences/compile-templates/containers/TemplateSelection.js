import { connect } from 'react-redux';
import { selectTemplate } from '../actions';
import { compileTemplates } from '../selectors';
import { TemplateSelection } from '../components/TemplateSelection';

const mapStateToProps = state => ({
  compileTemplates: compileTemplates(state),
});

const mapDispatchToProps = {
  selectTemplate,
};

const container = connect(mapStateToProps, mapDispatchToProps)(TemplateSelection);

export { container as TemplateSelection };
