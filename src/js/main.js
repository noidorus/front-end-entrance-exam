import { notificationManager } from './notificationManager.js';
import { DataManager } from './dataManager.js';
import { MaterialWave } from './materialWave.js';
import PDFGenerator from './pdfGenerator.js';

class ResumeEditor {
	/** @type {string} */
	static DEFAULT_STORAGE_KEY = 'resume-data';
	
	/** @type {number} */
	static SAVE_DELAY = 100;
	
	/** @type {HTMLElement[]} */
	#editableElements = [];
	
	/** @type {DataManager} */
	#dataManager;
	
	/** @type {MaterialWave} */
	#materialWave;
	
	/** @type {number|null} */
	#saveTimeoutId = null;

	/**
	 * @param {string} [storageKey=DEFAULT_STORAGE_KEY]
	 */
	constructor(storageKey = ResumeEditor.DEFAULT_STORAGE_KEY) {
		this.#dataManager = new DataManager(storageKey);
		this.#materialWave = new MaterialWave({ 
			autoInit: false, 
			duration: 1000,
			color: 'primary'
		});
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
		}
		
		// MaterialWave автоматически подключится к элементам с классом .ripple
		// Инициализируем ripple эффект для всех .ripple элементов  
		this.#materialWave.addToElements('.ripple', { 
			color: 'primary',
			duration: 1000
		});
	}

	#loadFromStorage() {
		try {
			const data = this.#dataManager.loadData();
			if (data) {
				this.#dataManager.restoreElementsData(this.#editableElements, data);
			}
		} catch {
			notificationManager.showError('Error loading saved data', 3000, 'save-indicator');
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
			const wasSaved = this.#dataManager.saveData(data);
			
			if (wasSaved) {
				notificationManager.showSuccess('✓ Saved', 2000, 'save-indicator');
			}
		} catch {
			notificationManager.showError('⚠ Error saving', 3000, 'save-indicator');
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
		
		notificationManager.hide('save-indicator');
		this.#materialWave.destroy();
		this.#editableElements = [];
	}
}

window.addEventListener('load', () => {
    const resumeEditor = new ResumeEditor();
    resumeEditor.init();

    PDFGenerator.init();
});
