import '../css/material-wave.css';

export class MaterialWave {
	static DEFAULT_OPTIONS = {
		color: 'primary',
		duration: 600,
		autoInit: true
	};

	/** @type {WeakMap<HTMLElement, AbortController>} */
	#elementControllers = new WeakMap();

	/** @param {Object} [options] */
	constructor(options = {}) {
		this.options = { ...MaterialWave.DEFAULT_OPTIONS, ...options };
		
		if (this.options.autoInit) {
			this.addToElements('.ripple');
		}
	}

	/** 
	 * @param {string|HTMLElement|NodeList|HTMLElement[]} selector 
	 * @param {Object} [elementOptions] 
	 */
	addToElements(selector, elementOptions = {}) {
		const elements = this.#resolveElements(selector);
		elements.forEach(element => this.attachToElement(element, elementOptions));
	}

	/** 
	 * @param {HTMLElement} element 
	 * @param {Object} [elementOptions] 
	 */
	attachToElement(element, elementOptions = {}) {
		if (this.#elementControllers.has(element)) return;

		const controller = new AbortController();
		this.#elementControllers.set(element, controller);

		const options = { ...this.options, ...elementOptions };

		['mousedown', 'touchstart'].forEach(eventType => {
			element.addEventListener(eventType, (e) => {
				this.#createRipple(e, element, options);
			}, { 
				signal: controller.signal,
				passive: true 
			});
		});

		element.classList.add('ripple');
	}

	/** @param {HTMLElement} element */
	detachFromElement(element) {
		const controller = this.#elementControllers.get(element);
		if (controller) {
			controller.abort();
			this.#elementControllers.delete(element);
		}
		element.classList.remove('ripple');
	}

	/** 
	 * @param {Event} event 
	 * @param {HTMLElement} element 
	 * @param {Object} options 
	 */
	#createRipple(event, element, options) {
		const rect = element.getBoundingClientRect();
		const size = Math.max(rect.width, rect.height);
		
		const clientX = event.touches ? event.touches[0].clientX : event.clientX;
		const clientY = event.touches ? event.touches[0].clientY : event.clientY;
		
		const x = clientX - rect.left - size / 2;
		const y = clientY - rect.top - size / 2;

		const ripple = document.createElement('span');
		ripple.className = 'material-wave-ripple';
		ripple.style.cssText = `
			width: ${size}px;
			height: ${size}px;
			left: ${x}px;
			top: ${y}px;
			background-color: ${this.#getColorValue(options.color)};
			animation-duration: ${options.duration}ms;
		`;

		element.appendChild(ripple);

		setTimeout(() => {
			if (ripple.parentNode) {
				ripple.parentNode.removeChild(ripple);
			}
		}, options.duration);
	}

	/** 
	 * @param {string|HTMLElement|NodeList|HTMLElement[]} selector 
	 * @returns {HTMLElement[]} 
	 */
	#resolveElements(selector) {
		if (typeof selector === 'string') {
			return Array.from(document.querySelectorAll(selector));
		}
		if (selector instanceof HTMLElement) {
			return [selector];
		}
		if (selector instanceof NodeList || Array.isArray(selector)) {
			return Array.from(selector);
		}
		return [];
	}

	/** 
	 * @param {string} color 
	 * @returns {string} 
	 */
	#getColorValue(color) {
		const colorMap = {
			primary: 'rgba(33, 150, 243, 0.3)',
			secondary: 'rgba(255, 193, 7, 0.3)',
			success: 'rgba(76, 175, 80, 0.3)',
			error: 'rgba(244, 67, 54, 0.3)',
			white: 'rgba(255, 255, 255, 0.3)',
			black: 'rgba(0, 0, 0, 0.3)'
		};

		return colorMap[color] || color;
	}

	destroy() {
		this.#elementControllers.forEach((controller, element) => {
			controller.abort();
			element.classList.remove('ripple');
		});
		this.#elementControllers.clear();
	}
}
