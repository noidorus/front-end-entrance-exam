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
		this.addEditingStyles();
		console.log('Resume Editor initialized');
	}

	#findEditableElements() {
		this.editableElements = document.querySelectorAll('[contenteditable="true"]');
		console.log(`Found ${this.editableElements.length} editable elements`);
	}

	#loadFromStorage() {
		try {
			const savedData = localStorage.getItem(this.storageKey);
			if (savedData) {
				const data = JSON.parse(savedData);
				this.#restoreData(data);
				console.log('Data loaded from localStorage');
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
			console.log('Data saved to localStorage');
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

		// Сохранение перед закрытием страницы
		window.addEventListener('beforeunload', () => {
			this.#saveToStorage();
		});
	}

	/**
	 * @param {HTMLElement} element
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

	// Добавляем базовые стили для редактирования
	addEditingStyles() {
		const style = document.createElement('style');
		style.textContent = `
			[contenteditable="true"]:hover {
				background-color: rgba(40, 217, 121, 0.08);
				transition: background-color 0.2s ease;
				cursor: text;
			}
			
			[contenteditable="true"].editing {
				background-color: rgba(40, 217, 121, 0.12);
				outline: 1px solid rgba(40, 217, 121, 0.3);
				outline-offset: 2px;
				border-radius: 3px;
			}
			
			[contenteditable="true"]:focus {
				outline: none;
			}
		`;
		document.head.appendChild(style);
	}
}

const resumeEditor = new ResumeEditor('resume-data');
resumeEditor.init();
