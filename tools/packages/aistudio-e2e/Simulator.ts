declare global {
  interface Window {
    __E2E_INJECT_IMAGE__?: (dataUrl: string, name: string) => void;
    __E2E_SPEED__?: number;
    __E2E_RESET__?: () => void;
    __E2E_CURSOR__?: {
      move: (x: number, y: number) => void;
      down: (drag?: boolean) => void;
      up: () => void;
      hide: () => void;
    };
  }
}

const getDelay = () => (window.__E2E_SPEED__ || 1) * 1000;
const getMoveTime = () => (window.__E2E_SPEED__ || 1) * 500;

const createPointerEvent = (type: string, init: any) => {
  try {
    return new PointerEvent(type, init);
  } catch {
    return new MouseEvent(type, init);
  }
};

export const Simulator = {
  async moveCursorTo(x: number, y: number) {
    window.__E2E_CURSOR__?.move(x, y);
    await new Promise((r) => setTimeout(r, getMoveTime()));
  },

  isVisible(el: HTMLElement): boolean {
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  },

  async waitFor(selector: string, timeout = 10000): Promise<HTMLElement> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const elements = Array.from(
        document.querySelectorAll(selector),
      ) as HTMLElement[];
      const visibleEl = elements.find((el) => this.isVisible(el));
      if (visibleEl) return visibleEl;
      await new Promise((r) => setTimeout(r, 300));
    }
    throw new Error(
      `Visible element "${selector}" not found after ${timeout}ms`,
    );
  },

  async waitForText(text: string, timeout = 10000): Promise<HTMLElement> {
    const start = Date.now();
    const lowerText = text.toLowerCase();
    while (Date.now() - start < timeout) {
      const tags = "span, div, button, label, h1, h2, h3, h4, input, option";
      const elements = Array.from(
        document.querySelectorAll(tags),
      ) as HTMLElement[];
      const sortedByDepth = elements.sort(
        (a, b) =>
          a.querySelectorAll("*").length - b.querySelectorAll("*").length,
      );
      const found = sortedByDepth.find((el) => {
        const nodeText =
          el.textContent?.toLowerCase() ||
          (el as HTMLInputElement).value?.toLowerCase() ||
          "";
        if (!nodeText.includes(lowerText)) return false;
        return this.isVisible(el);
      });
      if (found) return found;
      await new Promise((r) => setTimeout(r, 400));
    }
    throw new Error(`Visible text "${text}" not found after ${timeout}ms`);
  },

  async click(selectorOrEl: string | HTMLElement) {
    const el =
      typeof selectorOrEl === "string"
        ? await this.waitFor(selectorOrEl)
        : selectorOrEl;
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    await this.clickAt(el, rect.width / 2, rect.height / 2);
  },

  async clickAt(selectorOrEl: string | HTMLElement, offsetX: number, offsetY: number) {
    const el =
      typeof selectorOrEl === "string"
        ? await this.waitFor(selectorOrEl)
        : selectorOrEl;
    const rect = el.getBoundingClientRect();
    const x = rect.left + offsetX;
    const y = rect.top + offsetY;
    await this.moveCursorTo(x, y);
    window.__E2E_CURSOR__?.down();
    const eventInit = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: x,
      clientY: y,
      buttons: 1,
      pointerId: 1,
      pointerType: "mouse",
    };

    el.dispatchEvent(createPointerEvent("pointerdown", eventInit));
    el.dispatchEvent(new MouseEvent("mousedown", eventInit));
    await new Promise((r) => setTimeout(r, 50));
    window.__E2E_CURSOR__?.up();
    el.dispatchEvent(createPointerEvent("pointerup", eventInit));
    el.dispatchEvent(new MouseEvent("mouseup", eventInit));
    el.dispatchEvent(new MouseEvent("click", eventInit));
    await new Promise((r) => setTimeout(r, getDelay()));
  },

  async rightClick(
    selectorOrEl: string | HTMLElement,
    xOffset: number = 0,
    yOffset: number = 0,
  ) {
    const el =
      typeof selectorOrEl === "string"
        ? await this.waitFor(selectorOrEl)
        : selectorOrEl;
    const rect = el.getBoundingClientRect();
    const x = rect.left + (xOffset || rect.width / 2);
    const y = rect.top + (yOffset || rect.height / 2);
    await this.moveCursorTo(x, y);
    window.__E2E_CURSOR__?.down();
    const eventInit = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: x,
      clientY: y,
      button: 2,
      buttons: 2,
    };
    el.dispatchEvent(createPointerEvent("pointerdown", eventInit));
    el.dispatchEvent(new MouseEvent("mousedown", eventInit));
    await new Promise((r) => setTimeout(r, 50));
    window.__E2E_CURSOR__?.up();
    el.dispatchEvent(createPointerEvent("pointerup", eventInit));
    el.dispatchEvent(new MouseEvent("mouseup", eventInit));
    el.dispatchEvent(new MouseEvent("contextmenu", eventInit));
    await new Promise((r) => setTimeout(r, getDelay()));
  },

  async dblClick(selectorOrEl: string | HTMLElement) {
    const el =
      typeof selectorOrEl === "string"
        ? await this.waitFor(selectorOrEl)
        : selectorOrEl;
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    await this.moveCursorTo(x, y);
    window.__E2E_CURSOR__?.down();
    if (typeof el.focus === "function") el.focus();
    const createClick = (detail: number, type: string) =>
      new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        view: window,
        detail,
        clientX: x,
        clientY: y,
        buttons: 1,
      });
    const createPointer = (type: string) =>
      createPointerEvent(type, {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: x,
        clientY: y,
        pointerId: 1,
        pointerType: "mouse",
      });

    el.dispatchEvent(createPointer("pointerdown"));
    el.dispatchEvent(createClick(1, "mousedown"));
    el.dispatchEvent(createPointer("pointerup"));
    el.dispatchEvent(createClick(1, "mouseup"));
    el.dispatchEvent(createClick(1, "click"));
    await new Promise((r) => setTimeout(r, 50));
    el.dispatchEvent(createPointer("pointerdown"));
    el.dispatchEvent(createClick(2, "mousedown"));
    el.dispatchEvent(createPointer("pointerup"));
    el.dispatchEvent(createClick(2, "mouseup"));
    el.dispatchEvent(createClick(2, "click"));
    el.dispatchEvent(createClick(2, "dblclick"));
    window.__E2E_CURSOR__?.up();
    await new Promise((r) => setTimeout(r, getDelay()));
  },

  async type(selector: string, text: string) {
    const el = (await this.waitFor(selector)) as HTMLInputElement;
    if (typeof el.focus === "function") el.focus();
    const rect = el.getBoundingClientRect();
    await this.moveCursorTo(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )?.set;
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(el, text);
    } else {
      el.value = text;
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        code: "Enter",
      }),
    );
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new Event("blur", { bubbles: true }));
    await new Promise((r) => setTimeout(r, getDelay()));
  },

  async setValue(selector: string, value: string | number) {
    const el = (await this.waitFor(selector)) as HTMLInputElement;
    if (typeof el.focus === "function") el.focus();
    const rect = el.getBoundingClientRect();
    await this.moveCursorTo(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )?.set;
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(el, value.toString());
    } else {
      el.value = value.toString();
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((r) => setTimeout(r, getDelay()));
  },

  async dragFromTo(
    selectorOrEl: string | HTMLElement,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    steps = 12
  ) {
    const el =
      typeof selectorOrEl === "string"
        ? await this.waitFor(selectorOrEl)
        : selectorOrEl;
    const rect = el.getBoundingClientRect();
    const absoluteStartX = rect.left + startX;
    const absoluteStartY = rect.top + startY;
    const absoluteEndX = rect.left + endX;
    const absoluteEndY = rect.top + endY;
    await this.moveCursorTo(absoluteStartX, absoluteStartY);
    window.__E2E_CURSOR__?.down(true);
    const eventInit = {
      clientX: absoluteStartX,
      clientY: absoluteStartY,
      bubbles: true,
      buttons: 1,
      view: window,
      pointerId: 1,
      pointerType: "mouse",
    };
    try {
      el.dispatchEvent(createPointerEvent("pointerdown", eventInit));
    } catch {}
    el.dispatchEvent(new MouseEvent("mousedown", eventInit));
    
    for (let i = 1; i <= steps; i++) {
      const curX = absoluteStartX + ((absoluteEndX - absoluteStartX) * i) / steps;
      const curY = absoluteStartY + ((absoluteEndY - absoluteStartY) * i) / steps;
      window.__E2E_CURSOR__?.move(curX, curY);
      let pInit = { ...eventInit, clientX: curX, clientY: curY };
      try {
        el.dispatchEvent(createPointerEvent("pointermove", pInit));
      } catch {}
      try {
        window.dispatchEvent(createPointerEvent("pointermove", pInit));
      } catch {}
      try {
        document.documentElement.dispatchEvent(
          createPointerEvent("pointermove", pInit),
        );
      } catch {}
      const moveEvent = new MouseEvent("mousemove", pInit);
      el.dispatchEvent(moveEvent);
      window.dispatchEvent(moveEvent);
      document.documentElement.dispatchEvent(moveEvent);
      await new Promise((r) => setTimeout(r, 40));
    }
    window.__E2E_CURSOR__?.up();
    const upInit = {
      ...eventInit,
      clientX: absoluteEndX,
      clientY: absoluteEndY,
    };
    try {
      el.dispatchEvent(createPointerEvent("pointerup", upInit));
    } catch {}
    try {
      window.dispatchEvent(createPointerEvent("pointerup", upInit));
    } catch {}
    try {
      document.documentElement.dispatchEvent(
        createPointerEvent("pointerup", upInit),
      );
    } catch {}
    const upEvent = new MouseEvent("mouseup", upInit);
    el.dispatchEvent(upEvent);
    window.dispatchEvent(upEvent);
    document.documentElement.dispatchEvent(upEvent);
    await new Promise((r) => setTimeout(r, getDelay() + 500));
  },

  async drag(
    selectorOrEl: string | HTMLElement,
    deltaX: number,
    deltaY: number,
  ) {
    const el =
      typeof selectorOrEl === "string"
        ? await this.waitFor(selectorOrEl)
        : selectorOrEl;
    const rect = el.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;
    await this.moveCursorTo(startX, startY);
    window.__E2E_CURSOR__?.down(true);
    const eventInit = {
      clientX: startX,
      clientY: startY,
      bubbles: true,
      buttons: 1,
      view: window,
      pointerId: 1,
      pointerType: "mouse",
    };
    try {
      el.dispatchEvent(new PointerEvent("pointerdown", eventInit));
    } catch {}
    el.dispatchEvent(new MouseEvent("mousedown", eventInit));
    const steps = 12;
    for (let i = 1; i <= steps; i++) {
      const curX = startX + (deltaX * i) / steps;
      const curY = startY + (deltaY * i) / steps;
      window.__E2E_CURSOR__?.move(curX, curY);
      let pInit = { ...eventInit, clientX: curX, clientY: curY };
      try {
        el.dispatchEvent(new PointerEvent("pointermove", pInit));
      } catch {}
      try {
        window.dispatchEvent(new PointerEvent("pointermove", pInit));
      } catch {}
      try {
        document.documentElement.dispatchEvent(
          new PointerEvent("pointermove", pInit),
        );
      } catch {}
      const moveEvent = new MouseEvent("mousemove", pInit);
      el.dispatchEvent(moveEvent);
      window.dispatchEvent(moveEvent);
      document.documentElement.dispatchEvent(moveEvent);
      await new Promise((r) => setTimeout(r, 40));
    }
    window.__E2E_CURSOR__?.up();
    const upInit = {
      ...eventInit,
      clientX: startX + deltaX,
      clientY: startY + deltaY,
    };
    try {
      el.dispatchEvent(new PointerEvent("pointerup", upInit));
    } catch {}
    try {
      window.dispatchEvent(new PointerEvent("pointerup", upInit));
    } catch {}
    try {
      document.documentElement.dispatchEvent(
        new PointerEvent("pointerup", upInit),
      );
    } catch {}
    const upEvent = new MouseEvent("mouseup", upInit);
    el.dispatchEvent(upEvent);
    window.dispatchEvent(upEvent);
    document.documentElement.dispatchEvent(upEvent);
    await new Promise((r) => setTimeout(r, getDelay() + 500));
  },

  async injectTestImage(
    name: string = "TEST_ASSET.png",
    bgColor: string = "#FFFFFF",
    textColor: string = "#000000",
    w = 512,
    h = 512,
  ) {
    let retries = 50;
    while (!window.__E2E_INJECT_IMAGE__ && retries > 0) {
      await new Promise((r) => setTimeout(r, 100));
      retries--;
    }
    if (!window.__E2E_INJECT_IMAGE__) {
      throw new Error("__E2E_INJECT_IMAGE__ is not attached to window!");
    }

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = textColor;
    ctx.font = "bold 120px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("1", w * 0.25, h * 0.25);
    ctx.fillText("2", w * 0.75, h * 0.25);
    ctx.fillText("3", w * 0.25, h * 0.75);
    ctx.fillText("4", w * 0.75, h * 0.75);
    ctx.strokeStyle = "rgba(0,0,0,0.1)";
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
    window.__E2E_INJECT_IMAGE__(canvas.toDataURL(), name);
    await this.waitForText(name);
  },
};
