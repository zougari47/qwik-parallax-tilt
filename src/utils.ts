import type { Options, State } from './types';

export const defaultSettings: Required<Options> = {
  reverse: false,
  max: 15,
  startX: 0,
  startY: 0,
  perspective: 1000,
  easing: 'cubic-bezier(.03,.98,.52,.99)',
  scale: 1,
  speed: 300,
  transition: true,
  axis: null,
  glare: false,
  maxGlare: 1,
  glarePrerender: false,
  fullPageListening: false,
  mouseEventElement: null,
  reset: true,
  resetToStart: true,
  gyroscope: true,
  gyroscopeMinAngleX: -45,
  gyroscopeMaxAngleX: 45,
  gyroscopeMinAngleY: -45,
  gyroscopeMaxAngleY: 45,
  gyroscopeSamples: 10,
};

// ---- Helper Functions ----
// Get viewport dimensions
export function getViewportSize(): { width: number; height: number } {
  return {
    width: window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth,
    height:
      window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight,
  };
}

// Apply transition to element and optional glare element
export function applyTransition(element: HTMLElement, state: State, settings: Options): void {
  if (state.transitionTimeout) clearTimeout(state.transitionTimeout);
  element.style.transition = `${settings.speed}ms ${settings.easing}`;
  if (settings.glare && state.glareElement) {
    state.glareElement.style.transition = `opacity ${settings.speed}ms ${settings.easing}`;
  }

  state.transitionTimeout = window.setTimeout(() => {
    element.style.transition = '';
    if (settings.glare && state.glareElement) {
      state.glareElement.style.transition = '';
    }
  }, settings.speed);
}

// Set glare element size based on target element
export function setGlareSize(element: HTMLElement, state: State): void {
  if (state.glareElement) {
    const glareSize =
      (element.offsetWidth > element.offsetHeight ? element.offsetWidth : element.offsetHeight) * 2;
    Object.assign(state.glareElement.style, {
      width: `${glareSize}px`,
      height: `${glareSize}px`,
    });
  }
}

// Determine event listener target
export function getEventListenerTarget(settings: Options, defaultElement: HTMLElement): Node {
  if (settings.fullPageListening) {
    return document;
  }

  if (typeof settings.mouseEventElement === 'string') {
    const mouseEventElement = document.querySelector(settings.mouseEventElement);
    if (mouseEventElement) return mouseEventElement;
  }

  if (settings.mouseEventElement instanceof Node) {
    return settings.mouseEventElement;
  }

  return defaultElement;
}
