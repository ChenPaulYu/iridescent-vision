class EventBus {
  constructor() {
    this.target = document.createElement('span');
  }

  on(type, handler, options) {
    this.target.addEventListener(type, handler, options);
    return () => this.target.removeEventListener(type, handler, options);
  }

  once(type, handler, options) {
    const wrapped = (event) => {
      cleanup();
      handler(event);
    };
    const cleanup = this.on(type, wrapped, options);
    return cleanup;
  }

  emit(type, detail) {
    this.target.dispatchEvent(
      new CustomEvent(type, {
        detail,
      })
    );
  }
}

export { EventBus };
