import { Options, State } from './types';

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
/*
Calculation Utilities (calculations.ts):
updateElementPosition
updateClientSize
getValues
getElementListener
Transform Utilities (transforms.ts):
setTransition
update
reset
Glare Utilities (glare.ts):
prepareGlare
updateGlareSize
Event Handlers (eventHandlers.ts):
onMouseEnter
onMouseMove
onMouseLeave
onDeviceOrientation
onWindowResize

 */
//  ---------- Helper functions ----------------
export const updateElementPosition = (element: HTMLDivElement, state: State) => {
  const rect = element.getBoundingClientRect();
  state.width = element.offsetWidth;
  state.height = element.offsetHeight;
  state.left = rect.left;
  state.top = rect.top;
};

export const updateClientSize = (state: State) => {
  state.clientWidth =
    window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
  state.clientHeight =
    window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
};

export const getValues = (state: State, settings: Options) => {
  if (!state.currentEvent) return { tiltX: 0, tiltY: 0, percentageX: 0, percentageY: 0, angle: 0 };

  let x, y;

  if (settings.fullPageListening) {
    x = state.currentEvent.clientX / state.clientWidth;
    y = state.currentEvent.clientY / state.clientHeight;
  } else {
    x = (state.currentEvent.clientX - state.left) / state.width;
    y = (state.currentEvent.clientY - state.top) / state.height;
  }

  x = Math.min(Math.max(x, 0), 1);
  y = Math.min(Math.max(y, 0), 1);

  const tiltX = parseFloat((state.reverse * (settings.max!! - x * settings.max!! * 2)).toFixed(2));
  const tiltY = parseFloat((state.reverse * (y * settings.max!! * 2 - settings.max!!)).toFixed(2));
  const angle =
    Math.atan2(
      state.currentEvent.clientX - (state.left + state.width / 2),
      -(state.currentEvent.clientY - (state.top + state.height / 2))
    ) *
    (180 / Math.PI);

  return {
    tiltX,
    tiltY,
    percentageX: x * 100,
    percentageY: y * 100,
    angle,
  };
};

export const update = (element: HTMLDivElement, state: State, settings: Options) => {
  const values = getValues(state, settings);

  element.style.transform =
    `perspective(${settings.perspective}px) ` +
    `rotateX(${settings.axis === 'x' ? 0 : values.tiltY}deg) ` +
    `rotateY(${settings.axis === 'y' ? 0 : values.tiltX}deg) ` +
    `scale3d(${settings.scale}, ${settings.scale}, ${settings.scale})`;

  if (settings.glare && state.glareElement) {
    state.glareElement.style.transform = `rotate(${values.angle}deg) translate(-50%, -50%)`;
    state.glareElement.style.opacity = `${(values.percentageY * settings.maxGlare!!) / 100}`;
  }

  // Dispatch custom event
  element.dispatchEvent(new CustomEvent('tiltChange', { detail: values }));

  // todo: Call Qwik callback if provided
  //   if (onTiltChange$) {
  //     $(() => {
  //       onTiltChange$(values);
  //     });
  //   }

  state.updateCall = null;
};

export const setTransition = (element: HTMLDivElement, state: State, settings: Options) => {
  clearTimeout(state.transitionTimeout ?? undefined);

  if (settings.transition) {
    element.style.transition = `transform ${settings.speed}ms ${settings.easing}`;
    if (settings.glare && state.glareElement) {
      state.glareElement.style.transition = `opacity ${settings.speed}ms ${settings.easing}`;
    }
  }

  state.transitionTimeout = window.setTimeout(() => {
    element.style.transition = '';
    if (settings.glare && state.glareElement) {
      state.glareElement.style.transition = '';
    }
  }, settings.speed) as number;
};

export const reset = (element: HTMLDivElement, state: State, settings: Options) => {
  updateElementPosition(element, state);
  element.style.willChange = 'transform';
  setTransition(element, state, settings);

  if (settings.fullPageListening) {
    state.currentEvent = {
      clientX: ((settings.startX!! + settings.max!!) / (2 * settings.max!!)) * state.clientWidth,
      clientY: ((settings.startY!! + settings.max!!) / (2 * settings.max!!)) * state.clientHeight,
    };
  } else {
    state.currentEvent = {
      clientX:
        state.left + ((settings.startX!! + settings.max!!) / (2 * settings.max!!)) * state.width,
      clientY:
        state.top + ((settings.startY!! + settings.max!!) / (2 * settings.max!!)) * state.height,
    };
  }

  const backupScale = settings.scale;
  settings.scale = 1;
  update(element, state, settings);
  settings.scale = backupScale;

  if (settings.glare && state.glareElement) {
    state.glareElement.style.transform = 'rotate(180deg) translate(-50%, -50%)';
    state.glareElement.style.opacity = '0';
  }
};

// ------- Glare functions -------

export const updateGlareSize = (element: HTMLDivElement, state: State, settings: Options) => {
  if (settings.glare && state.glareElement) {
    const glareSize =
      (element.offsetWidth > element.offsetHeight ? element.offsetWidth : element.offsetHeight) * 2;
    Object.assign(state.glareElement.style, {
      width: `${glareSize}px`,
      height: `${glareSize}px`,
    });
  }
};

export const prepareGlare = (element: HTMLDivElement, state: State, settings: Options) => {
  if (!settings.glarePrerender) {
    const jsTiltGlare = document.createElement('div');
    jsTiltGlare.classList.add('js-tilt-glare');

    const jsTiltGlareInner = document.createElement('div');
    jsTiltGlareInner.classList.add('js-tilt-glare-inner');

    jsTiltGlare.appendChild(jsTiltGlareInner);
    element.appendChild(jsTiltGlare);
  }

  state.glareElementWrapper = element.querySelector('.js-tilt-glare');
  state.glareElement = element.querySelector('.js-tilt-glare-inner');

  if (settings.glarePrerender) return;

  if (state.glareElementWrapper) {
    Object.assign(state.glareElementWrapper.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      pointerEvents: 'none',
      borderRadius: 'inherit',
    });
  }

  if (state.glareElement) {
    Object.assign(state.glareElement.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      pointerEvents: 'none',
      backgroundImage: `linear-gradient(0deg, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 100%)`,
      transform: 'rotate(180deg) translate(-50%, -50%)',
      transformOrigin: '0% 0%',
      opacity: '0',
    });

    updateGlareSize(element, state, settings);
  }
};
