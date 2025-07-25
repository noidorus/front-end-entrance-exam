import { notificationManager } from './notificationManager.js';
import { DataManager } from './dataManager.js';
import { MaterialWave } from './materialWave.js';
import PDFGenerator from './pdfGenerator.js';
import '../css/material-wave.css';

class ResumeEditor {
	static DEFAULT_STORAGE_KEY = 'resume-data';
	static SAVE_DELAY = 100;
	
	/** @type {HTMLElement[]} */
	#editableElements = [];
	/** @type {DataManager} */
	#dataManager;
	/** @type {MaterialWave} */
	#materialWave;
	/** @type {number|null} */
	#saveTimeoutId = null;

	/** @param {string} [storageKey] */
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
			this.#initializeNumberElements();
		} catch (error) {
			console.error('Load error:', error);
			notificationManager.showError('Error loading saved data', 3000, 'save-indicator');
			this.#initializeNumberElements();
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
		} catch (error) {
			console.error('Save error:', error);
			notificationManager.showError('⚠ Error saving', 3000, 'save-indicator');
		}
	}

	#attachEventListeners() {
		this.#editableElements.forEach((element) => {
			element.addEventListener('focus', this.#handleFocus.bind(this));
			element.addEventListener('blur', this.#handleBlur.bind(this));
		});

		window.addEventListener('beforeunload', () => {
			if (this.#saveTimeoutId) {
				clearTimeout(this.#saveTimeoutId);
			}
			this.#saveToStorage();
		});
	}

	/** @param {FocusEvent} event */
	#handleFocus(event) {
		const element = event.target;
		element.classList.add('editing');

		if (element.dataset.type === 'number') {
			this.#dataManager.restoreNumberText(element);
		}
	}

	/** @param {FocusEvent} event */
	#handleBlur(event) {
		const element = event.target;
		element.classList.remove('editing');

		if (element.dataset.type === 'list') {
			this.#dataManager.normalizeListContent(element);
		}

		if (element.dataset.type === 'number') {
			this.#dataManager.normalizeNumberContent(element);
		}

		this.#debouncedSave();
	}

	#initializeNumberElements() {
		const numberElements = document.querySelectorAll('[data-type="number"]');
		
		numberElements.forEach(element => {
			if (!element.classList.contains('progress-mode')) {
				const percentageValue = element.dataset.percentageValue;
				
				if (percentageValue) {
					const percentage = parseFloat(percentageValue);
					element.classList.add('progress-mode');
					element.style.setProperty('--progress-width', `${percentage}%`);
					element.textContent = '';
				} else {
					this.#dataManager.normalizeNumberContent(element);
				}
			}
		});
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
