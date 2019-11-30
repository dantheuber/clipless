import { connect } from 'react-redux';
import { compileTemplates } from '../selectors';
import { TemplatesList } from '../components/TemplatesList';

const mapStateToProps = state => ({
  compileTemplates: compileTemplates(state),
});

const container = connect(mapStateToProps)(TemplatesList);

export { container as TemplatesList };
