export default function baseSelector(NAME) {
  return prop => state => state[NAME][prop];
}