import actionTypeCreator from "../utils/action-type-creator";
import { NAME } from "./constants";

const ca = actionTypeCreator(NAME);

export const TOGGLE_MENU = ca('TOGGLE_MENU');
