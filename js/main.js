import { SaveIndicator } from './saveIndecator.js';

class ResumeEditor {
	/** @type {HTMLElement[]} */
	editableElements = [];
	storageKey = 'resume-data';
	saveIndicator = new SaveIndicator();

	constructor(storageKey) {
		this.storageKey = storageKey;
	}

	init() {
		this.#findEditableElements();
		this.#loadFromStorage();
		this.#attachEventListeners();
	}

	#findEditableElements() {
		this.editableElements = document.querySelectorAll('[contenteditable="true"]');
	}

	#loadFromStorage() {
		try {
			const savedData = localStorage.getItem(this.storageKey);
			if (savedData) {
				const data = JSON.parse(savedData);
				this.#restoreData(data);
			}
		} catch (error) {
			console.error('Error loading data:', error);
		}
	}

	#restoreData(data) {
		this.editableElements.forEach((element, index) => {
			const elementKey = this.#getElementKey(element, index);
			if (data[elementKey] === undefined) return;

			if (data[elementKey].type === 'list') {
				element.innerHTML = data[elementKey].data.map((item) => `<li>${item}</li>`).join('');
			} else {
				element.innerHTML = data[elementKey].data;
			}
		});
	}

	/**
	 * @param {HTMLElement} element
	 * @param {number} index
	 * @returns {string}
	 */
	#getElementKey(element, index) {
		return `${element.className}${index}` || `element-${index}`;
	}

	#saveToStorage() {
		const data = {};
		this.editableElements.forEach((element, index) => {
			const elementKey = this.#getElementKey(element, index);

			if (element.dataset.type === 'list') {
				data[elementKey] = {
					type: 'list',
					data: this.#parseListContent(element),
				};
			} else {
				data[elementKey] = {
					data: element.innerHTML,
				};
			}
		});

		try {
			localStorage.setItem(this.storageKey, JSON.stringify(data));
			this.saveIndicator.showSuccess();
		} catch (error) {
			console.error('Error saving data:', error);
			this.saveIndicator.showError();
		}
	}

	#attachEventListeners() {
		this.editableElements.forEach((element) => {
			element.addEventListener('focus', () => {
				element.classList.add('editing');
			});

			element.addEventListener('blur', () => {
				element.classList.remove('editing');

				if (element.dataset.type === 'list') {
					const listContent = this.#parseListContent(element);
					element.innerHTML = listContent.map((item) => `<li>${item}</li>`).join('');
				}

				setTimeout(() => {
					this.#saveToStorage();
				}, 100);
			});
		});

		window.addEventListener('beforeunload', () => {
			this.#saveToStorage();
		});
	}

	/**
	 * @param {HTMLElement} element
	 * @returns {string[]}
	 */
	#parseListContent(element) {
		return Array.from(element.childNodes).reduce((acc, { nodeType, textContent }) => {
			if (nodeType === Node.ELEMENT_NODE || nodeType === Node.TEXT_NODE) {
				if (textContent.trim()) {
					return [...acc, textContent.trim()];
				}
			}
			return acc;
		}, []);
	}
}

const resumeEditor = new ResumeEditor('resume-data');
resumeEditor.init();
