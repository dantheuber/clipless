export default function trackWindow(window, store) {
  window.on('resize', () => {
    const { width, height } = window.getBounds();
    store.set('windowBounds', { width, height });
  });

  window.on('move', () => {
    const pos = window.getPosition();
    store.set('position', {
      x: pos[0],
      y: pos[1],
    });
  });
}