import '../css/notification.css';

const NOTIFICATION_CONFIG = {
    TYPES: {
        SUCCESS: 'success',
        ERROR: 'error', 
        INFO: 'info',
        SAVING: 'saving'
    },
    DURATIONS: {
        SUCCESS: 2000,
        ERROR: 3000,
        INFO: 3000,
        SAVING: 0
    },
    ANIMATION: {
        HIDE_DELAY: 300,
        SHOW_DELAY: 50
    },
    MAX_NOTIFICATIONS: 5,
    CONTAINER_ID: 'notification-container',
    SAVE_NOTIFICATION_ID: 'save-indicator'
};

const CSS_CLASSES = {
    CONTAINER: 'notification-container',
    NOTIFICATION: 'notification',
    MESSAGE: 'notification-message',
    CLOSE: 'notification-close',
    SHOW: 'show'
};

/**
 * @typedef {Object} NotificationOptions
 * @property {string} message
 * @property {keyof NOTIFICATION_CONFIG.TYPES} type
 * @property {number} duration
 * @property {string|null} id
 * @property {boolean} closable
 */
export class NotificationManager {
    /** @type {Map<string, HTMLElement>} */
    #notifications = new Map();
    
    /** @type {Map<string, number>} */
    #timers = new Map();
    
    /** @type {HTMLElement} */
    #container;
    
    /** @type {number} */
    #idCounter = 0;

    constructor() {
        this.#container = this.#createContainer();
        this.#bindKeyboardEvents();
    }

    /**
     * @param {string|NotificationOptions} messageOrOptions
     * @param {keyof NOTIFICATION_CONFIG.TYPES} [type='info']
     * @param {number} [duration]
     * @param {string|null} [id]
     * @returns {string}
     */
    show(messageOrOptions, type = NOTIFICATION_CONFIG.TYPES.INFO, duration = null, id = null) {
        const options = typeof messageOrOptions === 'string' 
            ? { message: messageOrOptions, type, duration, id, closable: true }
            : { type: NOTIFICATION_CONFIG.TYPES.INFO, duration: null, id: null, closable: true, ...messageOrOptions };

        const notificationId = options.id || this.#generateId();
        const finalDuration = options.duration ?? NOTIFICATION_CONFIG.DURATIONS[options.type.toUpperCase()] ?? NOTIFICATION_CONFIG.DURATIONS.INFO;

        if (this.#notifications.has(notificationId)) {
            this.update(notificationId, options);
            return notificationId;
        }

        this.#enforceMaxNotifications();

        const notification = this.#createNotification(options, notificationId);
        this.#notifications.set(notificationId, notification);
        this.#container.appendChild(notification);

        setTimeout(() => {
            notification.classList.add(CSS_CLASSES.SHOW);
        }, NOTIFICATION_CONFIG.ANIMATION.SHOW_DELAY);

        if (finalDuration > 0) {
            this.#setHideTimer(notificationId, finalDuration);
        }

        return notificationId;
    }

    /**
     * @param {string} id
     * @param {Partial<NotificationOptions>} options
     */
    update(id, options) {
        const notification = this.#notifications.get(id);
        if (!notification) return;

        if (options.message) {
            const messageEl = notification.querySelector(`.${CSS_CLASSES.MESSAGE}`);
            if (messageEl) messageEl.textContent = options.message;
        }

        if (options.type) {
            notification.className = `${CSS_CLASSES.NOTIFICATION} ${CSS_CLASSES.NOTIFICATION}--${options.type} ${CSS_CLASSES.SHOW}`;
        }

        if (options.duration !== undefined) {
            this.#clearTimer(id);
            if (options.duration > 0) {
                this.#setHideTimer(id, options.duration);
            }
        }
    }

    /**
     * @param {string} id
     * @returns {Promise<void>}
     */
    async hide(id) {
        const notification = this.#notifications.get(id);
        if (!notification) return;

        this.#clearTimer(id);
        notification.classList.remove(CSS_CLASSES.SHOW);

        return new Promise(resolve => {
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                this.#notifications.delete(id);
                resolve();
            }, NOTIFICATION_CONFIG.ANIMATION.HIDE_DELAY);
        });
    }

    /**
     * @returns {Promise<void[]>}
     */
    hideAll() {
        const hidePromises = Array.from(this.#notifications.keys()).map(id => this.hide(id));
        return Promise.all(hidePromises);
    }

    /**
     * @param {string} id
     * @returns {boolean}
     */
    has(id) {
        return this.#notifications.has(id);
    }

    /**
     * @returns {number}
     */
    count() {
        return this.#notifications.size;
    }

    showSuccess(message, duration = NOTIFICATION_CONFIG.DURATIONS.SUCCESS, id = null) {
        return this.show(message, NOTIFICATION_CONFIG.TYPES.SUCCESS, duration, id);
    }

    showError(message, duration = NOTIFICATION_CONFIG.DURATIONS.ERROR, id = null) {
        return this.show(message, NOTIFICATION_CONFIG.TYPES.ERROR, duration, id);
    }

    showInfo(message, duration = NOTIFICATION_CONFIG.DURATIONS.INFO, id = null) {
        return this.show(message, NOTIFICATION_CONFIG.TYPES.INFO, duration, id);
    }

    showSaving(message = '💾 Saving...', id = NOTIFICATION_CONFIG.SAVE_NOTIFICATION_ID) {
        return this.show(message, NOTIFICATION_CONFIG.TYPES.SAVING, NOTIFICATION_CONFIG.DURATIONS.SAVING, id);
    }

    hideSaving() {
        return this.hide(NOTIFICATION_CONFIG.SAVE_NOTIFICATION_ID);
    }

    destroy() {
        this.#clearAllTimers();
        this.hideAll();
        if (this.#container?.parentNode) {
            this.#container.parentNode.removeChild(this.#container);
        }
        this.#notifications.clear();
    }

    // Приватные методы

    #createContainer() {
        const container = document.createElement('div');
        container.id = NOTIFICATION_CONFIG.CONTAINER_ID;
        container.className = CSS_CLASSES.CONTAINER;
        container.setAttribute('aria-live', 'polite');
        container.setAttribute('aria-label', 'Notifications');
        document.body.appendChild(container);
        return container;
    }

    #createNotification(options, id) {
        const { message, type, closable } = options;
        
        const notification = document.createElement('div');
        notification.className = `${CSS_CLASSES.NOTIFICATION} ${CSS_CLASSES.NOTIFICATION}--${type}`;
        notification.dataset.id = id;
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-atomic', 'true');

        const messageEl = document.createElement('span');
        messageEl.className = CSS_CLASSES.MESSAGE;
        messageEl.textContent = message;

        notification.appendChild(messageEl);

        if (closable) {
            const closeBtn = this.#createCloseButton(id);
            notification.appendChild(closeBtn);
        }

        return notification;
    }

    #createCloseButton(id) {
        const closeBtn = document.createElement('button');
        closeBtn.className = CSS_CLASSES.CLOSE;
        closeBtn.innerHTML = '×';
        closeBtn.setAttribute('aria-label', 'Close notification');
        closeBtn.setAttribute('type', 'button');
        closeBtn.onclick = () => this.hide(id);
        return closeBtn;
    }

    #generateId() {
        return `notification_${++this.#idCounter}_${Date.now()}`;
    }

    #setHideTimer(id, duration) {
        this.#clearTimer(id);
        const timerId = setTimeout(() => {
            this.hide(id);
            this.#timers.delete(id);
        }, duration);
        this.#timers.set(id, timerId);
    }

    #clearTimer(id) {
        const timerId = this.#timers.get(id);
        if (timerId) {
            clearTimeout(timerId);
            this.#timers.delete(id);
        }
    }

    #clearAllTimers() {
        this.#timers.forEach(timerId => clearTimeout(timerId));
        this.#timers.clear();
    }

    #enforceMaxNotifications() {
        if (this.#notifications.size >= NOTIFICATION_CONFIG.MAX_NOTIFICATIONS) {
            const oldestId = this.#notifications.keys().next().value;
            if (oldestId) this.hide(oldestId);
        }
    }

    #bindKeyboardEvents() {
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.count() > 0) {
                this.hideAll();
            }
        });
    }
}

export const notificationManager = new NotificationManager();