export class DataManager {
	/** @type {string} */
	#storageKey;

	/**
	 * @param {string} storageKey - ключ для localStorage
	 */
	constructor(storageKey) {
		this.#storageKey = storageKey;
	}

	/**
	 * @returns {Object|null} загруженные данные или null при ошибке
	 */
	loadData() {
		try {
			const savedData = localStorage.getItem(this.#storageKey);
			return savedData ? JSON.parse(savedData) : null;
		} catch (error) {
			console.error('Error loading data from localStorage:', error);
			throw new Error('Failed to load saved data');
		}
	}

	/**
	 * @param {Object} data - данные для сохранения
	 */
	saveData(data) {
		try {
			localStorage.setItem(this.#storageKey, JSON.stringify(data));
		} catch (error) {
			console.error('Error saving data to localStorage:', error);
			throw new Error('Failed to save data');
		}
	}

	/**
	 * @param {HTMLElement[]} elements - массив редактируемых элементов
	 * @returns {Object} собранные данные
	 */
	collectElementsData(elements) {
		const data = {};

		elements.forEach((element, index) => {
			const elementKey = this.#generateElementKey(element, index);

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

		return data;
	}

	/**
	 * @param {HTMLElement[]} elements - массив элементов для восстановления
	 * @param {Object} data - данные для восстановления
	 */
	restoreElementsData(elements, data) {
		elements.forEach((element, index) => {
			const elementKey = this.#generateElementKey(element, index);
			const elementData = data[elementKey];

			if (!elementData) return;

			if (elementData.type === 'list') {
				this.#restoreListContent(element, elementData.data);
			} else {
				this.#sanitizeAndSetContent(element, elementData.data);
			}
		});
	}

	/**
	 * @param {HTMLElement} element - элемент списка
	 */
	normalizeListContent(element) {
		const listContent = this.#parseListContent(element);
		const normalizedContent = listContent.map((item) => `<li>${this.#escapeHtml(item)}</li>`).join('');

		element.innerHTML = normalizedContent;
	}

	/**
	 * @param {HTMLElement} element - элемент
	 * @param {number} index - индекс элемента
	 * @returns {string} уникальный ключ
	 */
	#generateElementKey(element, index) {
		const className = element.className || 'no-class';
		const id = element.id || 'no-id';
		return `${className}-${id}-${index}`;
	}

	/**
	 * @param {HTMLElement} element - элемент списка
	 * @param {string[]} data - данные списка
	 */
	#restoreListContent(element, data) {
		if (!Array.isArray(data)) return;

		const listItems = data
			.filter((item) => typeof item === 'string' && item.trim())
			.map((item) => `<li>${this.#escapeHtml(item)}</li>`)
			.join('');

		element.innerHTML = listItems;
	}

	/**
	 * @param {HTMLElement} element - целевой элемент
	 * @param {string} content - содержимое для установки
	 */
	#sanitizeAndSetContent(element, content) {
		if (typeof content !== 'string') return;
		element.innerHTML = content;
	}

	/**
	 * @param {string} text - текст для экранирования
	 * @returns {string} экранированный текст
	 */
	#escapeHtml(text) {
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}

	/**
	 * @param {HTMLElement} element - элемент списка
	 * @returns {string[]} массив элементов списка
	 */
	#parseListContent(element) {
		return Array.from(element.childNodes).reduce((acc, node) => {
			const isValidNode = node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE;

			if (isValidNode && node.textContent?.trim()) {
				acc.push(node.textContent.trim());
			}

			return acc;
		}, []);
	}
}
