import { NAME } from '../constants';
import actionTypeConstructor from '../../utils/action-type-creator';

const ca = actionTypeConstructor(NAME);

export const CREATE_NEW_TEMPLATE = ca('CREATE_NEW_TEMPLATE');
export const DELETE_TEMPLATE = ca('DELETE_TEMPLATE');
export const MODIFY_TEMPLATE = ca('MODIFY_TEMPLATE');
