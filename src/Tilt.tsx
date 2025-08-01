import { component$, useSignal, useVisibleTask$, Slot, $ } from '@builder.io/qwik';
import type { QwikParallaxTilt, Options } from './types';
import { defaultSettings } from './utils';

export const Tilt = component$<QwikParallaxTilt>(({ options = {}, onTiltChange$, ...divProps }) => {
  const elementRef = useSignal<HTMLDivElement>();
  const settings = { ...defaultSettings, ...options };

  // todo: optimize the code and remove the warning "no-use-visible-task"
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
    const element = elementRef.value;
    if (!element) return;

    let width = 0;
    let height = 0;
    let clientWidth = 0;
    let clientHeight = 0;
    let left = 0;
    let top = 0;
    let gammazero: number | null = null;
    let betazero: number | null = null;
    let lastgammazero: number | null = null;
    let lastbetazero: number | null = null;
    let transitionTimeout: number | null = null;
    let updateCall: number | null = null;
    let currentEvent: MouseEvent | { clientX: number; clientY: number } | null = null;
    let gyroscopeSamples = settings.gyroscopeSamples;

    const reverse = settings.reverse ? -1 : 1;
    let glareElement: HTMLDivElement | null = null;
    let glareElementWrapper: HTMLDivElement | null = null;

    const updateElementPosition = () => {
      const rect = element.getBoundingClientRect();
      width = element.offsetWidth;
      height = element.offsetHeight;
      left = rect.left;
      top = rect.top;
    };

    const updateClientSize = () => {
      clientWidth =
        window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
      clientHeight =
        window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
    };

    const getValues = () => {
      if (!currentEvent) return { tiltX: 0, tiltY: 0, percentageX: 0, percentageY: 0, angle: 0 };

      let x, y;

      if (settings.fullPageListening) {
        x = currentEvent.clientX / clientWidth;
        y = currentEvent.clientY / clientHeight;
      } else {
        x = (currentEvent.clientX - left) / width;
        y = (currentEvent.clientY - top) / height;
      }

      x = Math.min(Math.max(x, 0), 1);
      y = Math.min(Math.max(y, 0), 1);

      const tiltX = parseFloat((reverse * (settings.max - x * settings.max * 2)).toFixed(2));
      const tiltY = parseFloat((reverse * (y * settings.max * 2 - settings.max)).toFixed(2));
      const angle =
        Math.atan2(
          currentEvent.clientX - (left + width / 2),
          -(currentEvent.clientY - (top + height / 2))
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

      if (settings.glare && glareElement) {
        glareElement.style.transform = `rotate(${values.angle}deg) translate(-50%, -50%)`;
        glareElement.style.opacity = `${(values.percentageY * settings.maxGlare) / 100}`;
      }

      // Dispatch custom event
      element.dispatchEvent(new CustomEvent('tiltChange', { detail: values }));

      // Call Qwik callback if provided
      if (onTiltChange$) {
        $(() => {
          onTiltChange$(values);
        });
      }

      updateCall = null;
    };

    const setTransition = () => {
      if (transitionTimeout) clearTimeout(transitionTimeout);
      element.style.transition = `${settings.speed}ms ${settings.easing}`;
      if (settings.glare && glareElement) {
        glareElement.style.transition = `opacity ${settings.speed}ms ${settings.easing}`;
      }

      transitionTimeout = window.setTimeout(() => {
        element.style.transition = '';
        if (settings.glare && glareElement) {
          glareElement.style.transition = '';
        }
      }, settings.speed);
    };

    const reset = () => {
      updateElementPosition();
      element.style.willChange = 'transform';
      setTransition();

      if (settings.fullPageListening) {
        currentEvent = {
          clientX: ((settings.startX + settings.max) / (2 * settings.max)) * clientWidth,
          clientY: ((settings.startY + settings.max) / (2 * settings.max)) * clientHeight,
        };
      } else {
        currentEvent = {
          clientX: left + ((settings.startX + settings.max) / (2 * settings.max)) * width,
          clientY: top + ((settings.startY + settings.max) / (2 * settings.max)) * height,
        };
      }

      const backupScale = settings.scale;
      settings.scale = 1;
      update();
      settings.scale = backupScale;

      if (settings.glare && glareElement) {
        glareElement.style.transform = 'rotate(180deg) translate(-50%, -50%)';
        glareElement.style.opacity = '0';
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

      glareElementWrapper = element.querySelector('.js-tilt-glare');
      glareElement = element.querySelector('.js-tilt-glare-inner');

      if (settings.glarePrerender) return;

      if (glareElementWrapper) {
        Object.assign(glareElementWrapper.style, {
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

      if (glareElement) {
        Object.assign(glareElement.style, {
          position: 'absolute',
          top: '50%',
          left: '50%',
          pointerEvents: 'none',
          backgroundImage: `linear-gradient(0deg, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 100%)`,
          transform: 'rotate(180deg) translate(-50%, -50%)',
          transformOrigin: '0% 0%',
          opacity: '0',
        });

        updateGlareSize();
      }
    };

    const updateGlareSize = () => {
      if (settings.glare && glareElement) {
        const glareSize =
          (element.offsetWidth > element.offsetHeight
            ? element.offsetWidth
            : element.offsetHeight) * 2;
        Object.assign(glareElement.style, {
          width: `${glareSize}px`,
          height: `${glareSize}px`,
        });
      }
    };

    // Event handlers
    const onMouseEnter = () => {
      updateElementPosition();
      element.style.willChange = 'transform';
      setTransition();
    };

    const onMouseMove = (event: Event) => {
      const mouseEvent = event as MouseEvent;
      if (updateCall !== null) {
        cancelAnimationFrame(updateCall);
      }
      currentEvent = mouseEvent;
      updateCall = requestAnimationFrame(update);
    };

    const onMouseLeave = () => {
      setTransition();
      if (settings.reset) {
        requestAnimationFrame(reset);
      }
    };

    const onDeviceOrientation = (event: DeviceOrientationEvent) => {
      if (event.gamma === null || event.beta === null) return;

      updateElementPosition();

      if (gyroscopeSamples > 0) {
        lastgammazero = gammazero;
        lastbetazero = betazero;

        if (gammazero === null) {
          gammazero = event.gamma;
          betazero = event.beta;
        } else {
          gammazero = (event.gamma + (lastgammazero || 0)) / 2;
          betazero = (event.beta + (lastbetazero || 0)) / 2;
        }

        gyroscopeSamples -= 1;
      }

      const totalAngleX = settings.gyroscopeMaxAngleX - settings.gyroscopeMinAngleX;
      const totalAngleY = settings.gyroscopeMaxAngleY - settings.gyroscopeMinAngleY;

      const degreesPerPixelX = totalAngleX / width;
      const degreesPerPixelY = totalAngleY / height;

      const angleX = event.gamma - (settings.gyroscopeMinAngleX + (gammazero || 0));
      const angleY = event.beta - (settings.gyroscopeMinAngleY + (betazero || 0));

      const posX = angleX / degreesPerPixelX;
      const posY = angleY / degreesPerPixelY;

      if (updateCall !== null) {
        cancelAnimationFrame(updateCall);
      }

      currentEvent = {
        clientX: posX + left,
        clientY: posY + top,
      };

      updateCall = requestAnimationFrame(update);
    };

    const onWindowResize = () => {
      updateGlareSize();
      updateClientSize();
    };

    // Get element listener
    const getElementListener = () => {
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

      return element;
    };

    // Initialize
    const elementListener = getElementListener();

    // Add event listeners
    elementListener.addEventListener('mouseenter', onMouseEnter);
    elementListener.addEventListener('mouseleave', onMouseLeave);
    elementListener.addEventListener('mousemove', onMouseMove);

    if (settings.glare || settings.fullPageListening) {
      window.addEventListener('resize', onWindowResize);
    }

    if (settings.gyroscope) {
      window.addEventListener('deviceorientation', onDeviceOrientation);
    }

    // Initialize glare
    if (settings.glare) {
      prepareGlare();
    }

    // Initialize client size for full page listening
    if (settings.fullPageListening) {
      updateClientSize();
    }

    // Reset to initial state
    reset();

    if (settings.resetToStart === false) {
      settings.startX = 0;
      settings.startY = 0;
    }

    // Cleanup function
    cleanup(() => {
      if (transitionTimeout) clearTimeout(transitionTimeout);
      if (updateCall !== null) cancelAnimationFrame(updateCall);

      element.style.willChange = '';
      element.style.transition = '';
      element.style.transform = '';

      // Reset glare
      if (settings.glare && glareElement) {
        glareElement.style.transform = 'rotate(180deg) translate(-50%, -50%)';
        glareElement.style.opacity = '0';
      }

      // Remove event listeners
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
