import { SaveIndicator } from './saveIndecator.js';
import { DataManager } from './dataManager.js';
import { MaterialWave } from './materialWave.js';

class ResumeEditor {
	/** @type {string} */
	static DEFAULT_STORAGE_KEY = 'resume-data';
	
	/** @type {number} */
	static SAVE_DELAY = 100;
	
	/** @type {HTMLElement[]} */
	#editableElements = [];
	
	/** @type {SaveIndicator} */
	#saveIndicator;
	
	/** @type {DataManager} */
	#dataManager;
	
	/** @type {MaterialWave} */
	#materialWave;
	
	/** @type {number|null} */
	#saveTimeoutId = null;

	/**
	 * @param {string} [storageKey=DEFAULT_STORAGE_KEY] - ключ для localStorage
	 */
	constructor(storageKey = ResumeEditor.DEFAULT_STORAGE_KEY) {
		this.#saveIndicator = new SaveIndicator();
		this.#dataManager = new DataManager(storageKey);
		this.#materialWave = new MaterialWave({ autoInit: false });
	}

	init() {
		this.#findEditableElements();
		this.#loadFromStorage();
		this.#attachEventListeners();
	}

	#findEditableElements() {
		this.#editableElements = Array.from(
			document.querySelectorAll('[contenteditable="true"]')
		);

		if (this.#editableElements.length === 0) {
			console.warn('No editable elements found on the page');
		} else {
			this.#editableElements.forEach(element => {
				this.#materialWave.attachToElement(element, { 
					color: 'primary',
					duration: 1000,
				});
			});
		}
	}

	#loadFromStorage() {
		try {
			const data = this.#dataManager.loadData();
			if (data) {
				this.#dataManager.restoreElementsData(this.#editableElements, data);
			}
		} catch {
			this.#saveIndicator.showError('Error loading saved data');
		}
	}

	#debouncedSave() {
		if (this.#saveTimeoutId) {
			clearTimeout(this.#saveTimeoutId);
		}

		this.#saveTimeoutId = setTimeout(() => {
			this.#saveToStorage();
			this.#saveTimeoutId = null;
		}, ResumeEditor.SAVE_DELAY);
	}

	#saveToStorage() {
		try {
			const data = this.#dataManager.collectElementsData(this.#editableElements);
			this.#dataManager.saveData(data);
			this.#saveIndicator.showSuccess();
		} catch {
			this.#saveIndicator.showError();
		}
	}

	#attachEventListeners() {
		this.#attachElementListeners();
		this.#attachWindowListeners();
	}

	#attachElementListeners() {
		this.#editableElements.forEach((element) => {
			element.addEventListener('focus', this.#handleFocus.bind(this));
			element.addEventListener('blur', this.#handleBlur.bind(this));
		});
	}

	#attachWindowListeners() {
		window.addEventListener('beforeunload', () => {
			if (this.#saveTimeoutId) {
				clearTimeout(this.#saveTimeoutId);
			}
			this.#saveToStorage();
		});
	}

	#handleFocus(event) {
		const element = event.target;
		element.classList.add('editing');
	}

	#handleBlur(event) {
		const element = event.target;
		element.classList.remove('editing');

		if (element.dataset.type === 'list') {
			this.#normalizeListContent(element);
		}

		this.#debouncedSave();
	}

	#normalizeListContent(element) {
		this.#dataManager.normalizeListContent(element);
	}

	destroy() {
		if (this.#saveTimeoutId) {
			clearTimeout(this.#saveTimeoutId);
		}
		
		this.#saveIndicator.destroy();
		this.#materialWave.destroy();
		this.#editableElements = [];
	}
}

const resumeEditor = new ResumeEditor();
resumeEditor.init();
