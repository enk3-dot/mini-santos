const KEY_MAP = {
  ArrowUp: "forward",
  KeyW: "forward",
  ArrowDown: "back",
  KeyS: "back",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  ShiftLeft: "sprint",
  ShiftRight: "sprint"
};

const EDGE_KEYS = new Set(["Space", "KeyE", "KeyT"]);

export default class Input {
  constructor() {
    this.keys = new Set();
    this.pressed = new Set();

    window.addEventListener("keydown", (event) => {
      const action = KEY_MAP[event.code];
      if (action) {
        this.keys.add(action);
        event.preventDefault();
      }
      if (EDGE_KEYS.has(event.code)) {
        this.pressed.add(event.code);
        event.preventDefault();
      }
    });

    window.addEventListener("keyup", (event) => {
      const action = KEY_MAP[event.code];
      if (action) this.keys.delete(action);
    });
  }

  consumePressed(code) {
    if (this.pressed.has(code)) {
      this.pressed.delete(code);
      return true;
    }
    return false;
  }

  consumeJump() {
    return this.consumePressed("Space");
  }

  consumeInteract() {
    return this.consumePressed("KeyE");
  }

  consumeSwitch() {
    return this.consumePressed("KeyT");
  }
}
