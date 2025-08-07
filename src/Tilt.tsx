import { component$, useSignal, useVisibleTask$, Slot, $ } from '@builder.io/qwik';
import type { QwikParallaxTilt } from './types';
import {
  defaultSettings,
  getViewportSize,
  applyTransition,
  setGlareSize,
  getEventListenerTarget,
} from './utils';

// Define the TiltState interface with flat properties
interface TiltState {
  width: number;
  height: number;
  left: number;
  top: number;
  clientWidth: number;
  clientHeight: number;
  gammazero: number | null;
  betazero: number | null;
  lastgammazero: number | null;
  lastbetazero: number | null;
  samples: number;
  transitionTimeout: number | null;
  updateCall: number | null;
  glareElement: HTMLDivElement | null;
  glareWrapper: HTMLDivElement | null;
  currentEvent: MouseEvent | { clientX: number; clientY: number } | null;
  reverse: number;
}

export const Tilt = component$<QwikParallaxTilt>(({ options = {}, onTiltChange$, ...divProps }) => {
  const elementRef = useSignal<HTMLDivElement>();
  const settings = { ...defaultSettings, ...options };

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
    const element = elementRef.value;
    if (!element) return;

    const state: TiltState = {
      width: 0,
      height: 0,
      left: 0,
      top: 0,
      clientWidth: 0,
      clientHeight: 0,
      gammazero: null,
      betazero: null,
      lastgammazero: null,
      lastbetazero: null,
      samples: settings.gyroscopeSamples,
      transitionTimeout: null,
      updateCall: null,
      glareElement: null,
      glareWrapper: null,
      currentEvent: null,
      reverse: settings.reverse ? -1 : 1,
    };

    const updateElementPosition = () => {
      const rect = element.getBoundingClientRect();
      state.width = element.offsetWidth;
      state.height = element.offsetHeight;
      state.left = rect.left;
      state.top = rect.top;
    };

    const getValues = () => {
      if (!state.currentEvent)
        return { tiltX: 0, tiltY: 0, percentageX: 0, percentageY: 0, angle: 0 };

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

      const tiltX = parseFloat((state.reverse * (settings.max - x * settings.max * 2)).toFixed(2));
      const tiltY = parseFloat((state.reverse * (y * settings.max * 2 - settings.max)).toFixed(2));
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

    const update = () => {
      const values = getValues();

      element.style.transform =
        `perspective(${settings.perspective}px) ` +
        `rotateX(${settings.axis === 'x' ? 0 : values.tiltY}deg) ` +
        `rotateY(${settings.axis === 'y' ? 0 : values.tiltX}deg) ` +
        `scale3d(${settings.scale}, ${settings.scale}, ${settings.scale})`;

      if (settings.glare && state.glareElement) {
        state.glareElement.style.transform = `rotate(${values.angle}deg) translate(-50%, -50%)`;
        state.glareElement.style.opacity = `${(values.percentageY * settings.maxGlare) / 100}`;
      }

      element.dispatchEvent(new CustomEvent('tiltChange', { detail: values }));

      if (onTiltChange$) {
        $(() => {
          onTiltChange$(values);
        });
      }

      state.updateCall = null;
    };

    const reset = () => {
      updateElementPosition();
      element.style.willChange = 'transform';
      applyTransition(element, state, settings);

      if (settings.fullPageListening) {
        state.currentEvent = {
          clientX: ((settings.startX + settings.max) / (2 * settings.max)) * state.clientWidth,
          clientY: ((settings.startY + settings.max) / (2 * settings.max)) * state.clientHeight,
        };
      } else {
        state.currentEvent = {
          clientX:
            state.left + ((settings.startX + settings.max) / (2 * settings.max)) * state.width,
          clientY:
            state.top + ((settings.startY + settings.max) / (2 * settings.max)) * state.height,
        };
      }

      const backupScale = settings.scale;
      settings.scale = 1;
      update();
      settings.scale = backupScale;

      if (settings.glare && state.glareElement) {
        state.glareElement.style.transform = 'rotate(180deg) translate(-50%, -50%)';
        state.glareElement.style.opacity = '0';
      }
    };

    const prepareGlare = () => {
      if (!settings.glarePrerender) {
        const jsTiltGlare = document.createElement('div');
        jsTiltGlare.classList.add('js-tilt-glare');

        const jsTiltGlareInner = document.createElement('div');
        jsTiltGlareInner.classList.add('js-tilt-glare-inner');

        jsTiltGlare.appendChild(jsTiltGlareInner);
        element.appendChild(jsTiltGlare);
      }

      state.glareWrapper = element.querySelector('.js-tilt-glare') as HTMLDivElement;
      state.glareElement = element.querySelector('.js-tilt-glare-inner') as HTMLDivElement;

      if (settings.glarePrerender) return;

      if (state.glareWrapper) {
        Object.assign(state.glareWrapper.style, {
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

        setGlareSize(element, state);
      }
    };

    const onMouseEnter = () => {
      updateElementPosition();
      element.style.willChange = 'transform';
      applyTransition(element, state, settings);
    };

    const onMouseMove = (event: Event) => {
      const mouseEvent = event as MouseEvent;
      if (state.updateCall !== null) {
        cancelAnimationFrame(state.updateCall);
      }
      state.currentEvent = mouseEvent;
      state.updateCall = requestAnimationFrame(update);
    };

    const onMouseLeave = () => {
      applyTransition(element, state, settings);
      if (settings.reset) {
        requestAnimationFrame(reset);
      }
    };

    const onDeviceOrientation = (event: DeviceOrientationEvent) => {
      if (event.gamma === null || event.beta === null) return;

      updateElementPosition();

      if (state.samples > 0) {
        state.lastgammazero = state.gammazero;
        state.lastbetazero = state.betazero;

        if (state.gammazero === null) {
          state.gammazero = event.gamma;
          state.betazero = event.beta;
        } else {
          state.gammazero = (event.gamma + (state.lastgammazero || 0)) / 2;
          state.betazero = (event.beta + (state.lastbetazero || 0)) / 2;
        }

        state.samples -= 1;
      }

      const totalAngleX = settings.gyroscopeMaxAngleX - settings.gyroscopeMinAngleX;
      const totalAngleY = settings.gyroscopeMaxAngleY - settings.gyroscopeMinAngleY;

      const degreesPerPixelX = totalAngleX / state.width;
      const degreesPerPixelY = totalAngleY / state.height;

      const angleX = event.gamma - (settings.gyroscopeMinAngleX + (state.gammazero || 0));
      const angleY = event.beta - (settings.gyroscopeMinAngleY + (state.betazero || 0));

      const posX = angleX / degreesPerPixelX;
      const posY = angleY / degreesPerPixelY;

      if (state.updateCall !== null) {
        cancelAnimationFrame(state.updateCall);
      }

      state.currentEvent = {
        clientX: posX + state.left,
        clientY: posY + state.top,
      };

      state.updateCall = requestAnimationFrame(update);
    };

    const onWindowResize = () => {
      setGlareSize(element, state);
      if (settings.fullPageListening) {
        const { width, height } = getViewportSize();
        state.clientWidth = width;
        state.clientHeight = height;
      }
    };

    const elementListener = getEventListenerTarget(settings, element);

    elementListener.addEventListener('mouseenter', onMouseEnter);
    elementListener.addEventListener('mouseleave', onMouseLeave);
    elementListener.addEventListener('mousemove', onMouseMove);

    if (settings.glare || settings.fullPageListening) {
      window.addEventListener('resize', onWindowResize);
    }

    if (settings.gyroscope) {
      window.addEventListener('deviceorientation', onDeviceOrientation);
    }

    if (settings.glare) {
      prepareGlare();
    }

    if (settings.fullPageListening) {
      const { width, height } = getViewportSize();
      state.clientWidth = width;
      state.clientHeight = height;
    }

    reset();

    if (settings.resetToStart === false) {
      settings.startX = 0;
      settings.startY = 0;
    }

    cleanup(() => {
      if (state.transitionTimeout) clearTimeout(state.transitionTimeout);
      if (state.updateCall !== null) cancelAnimationFrame(state.updateCall);

      element.style.willChange = '';
      element.style.transition = '';
      element.style.transform = '';

      if (settings.glare && state.glareElement) {
        state.glareElement.style.transform = 'rotate(180deg) translate(-50%, -50%)';
        state.glareElement.style.opacity = '0';
      }

      elementListener.removeEventListener('mouseenter', onMouseEnter);
      elementListener.removeEventListener('mouseleave', onMouseLeave);
      elementListener.removeEventListener('mousemove', onMouseMove);

      if (settings.gyroscope) {
        window.removeEventListener('deviceorientation', onDeviceOrientation);
      }

      if (settings.glare || settings.fullPageListening) {
        window.removeEventListener('resize', onWindowResize);
      }
    });
  });

  return (
    <div ref={elementRef} {...divProps}>
      <Slot />
    </div>
  );
});
