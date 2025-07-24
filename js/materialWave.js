import '../css/material-wave.css';

export class MaterialWave {
	/** @type {string} */
	static DEFAULT_COLOR = 'red';

	/** @type {number} */
	static DEFAULT_DURATION = 600;

	/** @type {WeakMap<HTMLElement, AbortController>} */
	#controllers = new WeakMap();

	/**
	 * @param {Object} [options={}] - настройки для Material Wave
	 * @param {string} [options.color='default'] - цвет ripple эффекта
	 * @param {number} [options.duration=600] - длительность анимации в мс
	 * @param {boolean} [options.autoInit=true] - автоматическая инициализация
	 */
	constructor(options = {}) {
		this.options = {
			color: options.color || MaterialWave.DEFAULT_COLOR,
			duration: options.duration || MaterialWave.DEFAULT_DURATION,
			autoInit: options.autoInit !== false,
		};

		if (this.options.autoInit) {
			this.#init();
		}
	}

	#init() {
		const elements = document.querySelectorAll('.material-wave');
		elements.forEach((element) => this.attachToElement(element));
	}

	/**
	 * @param {HTMLElement} element - элемент для добавления эффекта
	 * @param {Object} [options={}] - дополнительные настройки
	 */
	attachToElement(element, options = {}) {
		if (!(element instanceof HTMLElement)) {
			console.warn('MaterialWave: Invalid element provided');
			return;
		}

		this.detachFromElement(element);

		const controller = new AbortController();
		this.#controllers.set(element, controller);

		const effectOptions = { ...this.options, ...options };

		element.addEventListener(
			'mousedown',
			(event) => {
				this.#createRipple(element, event, effectOptions);
			},
			{ signal: controller.signal }
		);

		element.addEventListener(
			'touchstart',
			(event) => {
				const touch = event.touches[0];
				if (touch) {
					this.#createRipple(element, touch, effectOptions);
				}
			},
			{ signal: controller.signal, passive: true }
		);

		if (!element.classList.contains('material-wave')) {
			element.classList.add('material-wave');
		}
	}

	/**
	 * @param {HTMLElement} element - элемент для отключения эффекта
	 */
	detachFromElement(element) {
		const controller = this.#controllers.get(element);
		if (controller) {
			controller.abort();
			this.#controllers.delete(element);
		}
	}

	/**
	 * @param {string} selector - CSS селектор
	 * @param {Object} [options={}] - настройки эффекта
	 */
	addToElements(selector, options = {}) {
		const elements = document.querySelectorAll(selector);
		elements.forEach((element) => this.attachToElement(element, options));
	}

	/**
	 * @param {HTMLElement} element - элемент для эффекта
	 * @param {Object} [options={}] - настройки эффекта
	 */
	triggerRipple(element, options = {}) {
		if (!(element instanceof HTMLElement)) {
			console.warn('MaterialWave: Invalid element provided');
			return;
		}

		const rect = element.getBoundingClientRect();
		const centerX = rect.width / 2;
		const centerY = rect.height / 2;

		const mockEvent = {
			clientX: rect.left + centerX,
			clientY: rect.top + centerY,
		};

		this.#createRipple(element, mockEvent, { ...this.options, ...options });
	}

	destroy() {
		for (const [, controller] of this.#controllers) {
			controller.abort();
		}
		this.#controllers = new WeakMap();
	}

	/**
	 * @param {HTMLElement} element - родительский элемент
	 * @param {MouseEvent|Touch} event - событие клика или касания
	 * @param {Object} options - настройки эффекта
	 */
	#createRipple(element, event, options) {
		const rect = element.getBoundingClientRect();

		const x = (event.clientX || event.pageX) - rect.left;
		const y = (event.clientY || event.pageY) - rect.top;

		const ripple = document.createElement('div');
		ripple.className = this.#getRippleClassName(options);

		const size = this.#calculateRippleSize(rect, x, y);

		this.#setRippleStyles(ripple, x, y, size);

		element.appendChild(ripple);

		setTimeout(() => {
			if (ripple.parentNode) {
				ripple.parentNode.removeChild(ripple);
			}
		}, options.duration);
	}

	/**
	 * @param {Object} options - настройки эффекта
	 * @returns {string} строка с классами
	 */
	#getRippleClassName(options) {
		let className = 'material-wave-ripple';

		if (options.color && options.color !== 'default') {
			className += ` ${options.color}`;
		}

		if (options.duration < 400) {
			className += ' fast';
		} else if (options.duration > 700) {
			className += ' slow';
		}

		return className;
	}

	/**
	 * @param {DOMRect} rect - размеры родительского элемента
	 * @param {number} x - позиция X клика
	 * @param {number} y - позиция Y клика
	 * @returns {number} размер ripple
	 */
	#calculateRippleSize(rect, x, y) {
		const maxX = Math.max(x, rect.width - x);
		const maxY = Math.max(y, rect.height - y);

		return Math.sqrt(maxX * maxX + maxY * maxY) * 2;
	}

	/**
	 * @param {HTMLElement} ripple - элемент ripple
	 * @param {number} x - позиция X
	 * @param {number} y - позиция Y
	 * @param {number} size - размер ripple
	 */
	#setRippleStyles(ripple, x, y, size) {
		ripple.style.width = `${size}px`;
		ripple.style.height = `${size}px`;
		ripple.style.left = `${x - size / 2}px`;
		ripple.style.top = `${y - size / 2}px`;
	}
}
