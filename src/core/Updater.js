class Updater {
  constructor() {
    this.callbacks = new Set();
  }

  add(fn) {
    if (typeof fn !== 'function') return () => {};
    this.callbacks.add(fn);
    return () => this.callbacks.delete(fn);
  }

  update(delta) {
    this.callbacks.forEach((callback) => {
      try {
        callback(delta);
      } catch (err) {
        console.error('Updater callback failed', err);
      }
    });
  }
}

export { Updater };
