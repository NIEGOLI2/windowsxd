export function createInput(canvas) {
  const state = {
    cursor: {
      x: window.innerWidth * 0.7,
      y: window.innerHeight * 0.5,
      visible: true,
    },
    pointerDown: false,
    justClicked: false,
    rightClicked: false, // new: track right-clicks
    dragStart: null,
  };

  const updatePos = (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left);
    const y = (e.clientY - rect.top);
    state.cursor.x = x;
    state.cursor.y = y;
    state.cursor.visible = true;
  };

  const onPointerMove = (e) => {
    e.preventDefault();
    updatePos(e);
  };

  const onPointerDown = (e) => {
    e.preventDefault();
    updatePos(e);
    // left button
    if (e.button === 0) {
      state.pointerDown = true;
      state.justClicked = true;
      state.dragStart = { x: state.cursor.x, y: state.cursor.y };
    }
    // right button
    if (e.button === 2) {
      state.rightClicked = true;
      // don't set pointerDown for right clicks (so drags don't start)
    }
  };

  const onPointerUp = (e) => {
    e.preventDefault();
    if (e.button === 0) {
      state.pointerDown = false;
      state.dragStart = null;
    }
    // nothing special on right button up; we handle rightClicks on down
  };

  // Support custom right-click menu on both desktop and mobile long-press
  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    updatePos(e);
    state.rightClicked = true;
  });

  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('blur', () => {
    state.pointerDown = false;
    state.dragStart = null;
    state.rightClicked = false;
  });

  function frameEnd() {
    state.justClicked = false;
    state.rightClicked = false;
  }

  return {
    cursor: state.cursor,
    get pointerDown() {
      return state.pointerDown;
    },
    get justClicked() {
      return state.justClicked;
    },
    get rightClicked() {
      return state.rightClicked;
    },
    get dragStart() {
      return state.dragStart;
    },
    frameEnd,
  };
}