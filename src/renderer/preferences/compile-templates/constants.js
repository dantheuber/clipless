import uuidv1 from 'uuid/v1';

export const EXAMPLE_TEMPLATE = `Use {c#} tokens to indicate what clip number you would like to use, and where
Example:
Clip 1: {c1}
Clip 2: {c2}
Clip 3: {c3}`;
export const NEW_TEMPLATE_BASE = {
  id: uuidv1(),
  name: 'New Template',
  content: EXAMPLE_TEMPLATE,
};
