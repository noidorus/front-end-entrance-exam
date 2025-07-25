class NotificationManager {
	static NOTIFICATION_TYPES = {
		SUCCESS: 'success',
		ERROR: 'error',
		SAVING: 'saving'
	};

	static DEFAULT_DURATION = 3000;
	static DEFAULT_POSITION = 'top-right';

	/** @type {WeakMap<HTMLElement, AbortController>} */
	#elementControllers = new WeakMap();
	/** @type {Map<string, HTMLElement>} */
	#activeNotifications = new Map();

	/** 
	 * @param {string} message 
	 * @param {number} [duration] 
	 * @param {string} [id] 
	 */
	showSuccess(message, duration = NotificationManager.DEFAULT_DURATION, id = 'notification') {
		this.#createNotification(message, NotificationManager.NOTIFICATION_TYPES.SUCCESS, duration, id);
	}

	/** 
	 * @param {string} message 
	 * @param {number} [duration] 
	 * @param {string} [id] 
	 */
	showError(message, duration = NotificationManager.DEFAULT_DURATION, id = 'notification') {
		this.#createNotification(message, NotificationManager.NOTIFICATION_TYPES.ERROR, duration, id);
	}

	/** 
	 * @param {string} message 
	 * @param {string} [id] 
	 */
	showSaving(message, id = 'notification') {
		this.#createNotification(message, NotificationManager.NOTIFICATION_TYPES.SAVING, null, id);
	}

	/** 
	 * @param {string} message 
	 * @param {string} [id] 
	 */
	updateSaving(message, id = 'notification') {
		const notification = this.#activeNotifications.get(id);
		if (notification && notification.classList.contains('notification--saving')) {
			const messageElement = notification.querySelector('.notification__message');
			if (messageElement) {
				messageElement.textContent = message;
			}
		}
	}

	/** @param {string} [id] */
	hide(id = 'notification') {
		const notification = this.#activeNotifications.get(id);
		if (notification) {
			this.#removeNotification(notification, id);
		}
	}

	/** 
	 * @param {string} message 
	 * @param {string} type 
	 * @param {number|null} duration 
	 * @param {string} id 
	 */
	#createNotification(message, type, duration, id) {
		this.hide(id);

		const notification = document.createElement('div');
		notification.className = `notification notification--${type}`;
		notification.innerHTML = `<div class="notification__message">${message}</div>`;

		document.body.appendChild(notification);
		this.#activeNotifications.set(id, notification);

		requestAnimationFrame(() => {
			notification.classList.add('notification--visible');
		});

		if (duration !== null) {
			setTimeout(() => this.#removeNotification(notification, id), duration);
		}

		this.#attachClickToClose(notification, id);
	}

	/** 
	 * @param {HTMLElement} notification 
	 * @param {string} id 
	 */
	#removeNotification(notification, id) {
		if (!document.body.contains(notification)) return;

		const controller = this.#elementControllers.get(notification);
		if (controller) {
			controller.abort();
			this.#elementControllers.delete(notification);
		}

		notification.classList.remove('notification--visible');
		
		setTimeout(() => {
			if (document.body.contains(notification)) {
				document.body.removeChild(notification);
			}
			this.#activeNotifications.delete(id);
		}, 300);
	}

	/** 
	 * @param {HTMLElement} notification 
	 * @param {string} id 
	 */
	#attachClickToClose(notification, id) {
		const controller = new AbortController();
		this.#elementControllers.set(notification, controller);

		notification.addEventListener('click', () => {
			this.#removeNotification(notification, id);
		}, { signal: controller.signal });
	}
}

export const notificationManager = new NotificationManager();