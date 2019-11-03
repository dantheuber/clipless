export default function actionTypeCreator (namespace) {
  return (actionType) => `${namespace}/${actionType}`;
}