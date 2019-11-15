export default function simpleAction(type) {
  return (payload) => ({ type, payload });
}