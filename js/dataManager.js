export class DataManager {
	/** @type {string} */
	#storageKey;
	
	/** @type {string|null} */
	#lastSavedDataHash = null;

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
			if (savedData) {
				const data = JSON.parse(savedData);
				this.#lastSavedDataHash = this.#calculateDataHash(data);
				return data;
			}
			this.#lastSavedDataHash = null;
			return null;
		} catch (error) {
			console.error('Error loading data from localStorage:', error);
			throw new Error('Failed to load saved data');
		}
	}

	/**
	 * @param {Object} data - данные для сохранения
	 * @returns {boolean} true если данные были сохранены, false если не изменились
	 */
	saveData(data) {
		const currentDataHash = this.#calculateDataHash(data);
		
		if (this.#lastSavedDataHash === currentDataHash) {
			return false;
		}

		try {
			localStorage.setItem(this.#storageKey, JSON.stringify(data));
			this.#lastSavedDataHash = currentDataHash;
			return true;
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
				const listData = this.#parseListContent(element);
				data[elementKey] = {
					type: 'list',
					data: listData,
				};
			} else {
				let htmlData = element.innerHTML;
				
				if (htmlData.includes('material-wave-ripple')) {
					const tempDiv = document.createElement('div');
					tempDiv.innerHTML = htmlData;
					
					const ripples = tempDiv.querySelectorAll('.material-wave-ripple');
					ripples.forEach(ripple => ripple.remove());
					
					htmlData = tempDiv.innerHTML;
				}
				
				data[elementKey] = {
					data: htmlData,
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
		const classList = Array.from(element.classList)
			.filter(cls => !cls.startsWith('material-wave') && cls !== 'editing')
			.sort()
			.join(' ');
		
		const className = classList || 'no-class';
		const id = element.id || 'no-id';
		const tagName = element.tagName.toLowerCase();
		
		return `${tagName}-${className}-${id}-${index}`;
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

	/**
	 * @param {Object} data - данные для хэширования
	 * @returns {string} хэш данных
	 */
	#calculateDataHash(data) {
		const sortedData = this.#deepSortObject(data);
		const dataString = JSON.stringify(sortedData);
		return this.#simpleHash(dataString);
	}

	/**
	 * @param {any} obj - объект для сортировки
	 * @returns {any} отсортированный объект
	 */
	#deepSortObject(obj) {
		if (obj === null || typeof obj !== 'object') {
			return obj;
		}
		
		if (Array.isArray(obj)) {
			return obj.map(item => this.#deepSortObject(item));
		}
		
		const sortedObj = {};
		const sortedKeys = Object.keys(obj).sort();
		
		for (const key of sortedKeys) {
			sortedObj[key] = this.#deepSortObject(obj[key]);
		}
		
		return sortedObj;
	}

	/**
	 * @param {string} str - строка для хэширования
	 * @returns {string} хэш строки
	 */
	#simpleHash(str) {
		let hash = 0;
		if (str.length === 0) return hash.toString();
		
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash;
		}
		
		return Math.abs(hash).toString();
	}

	/**
	 * Сброс кэша данных (принудительное сохранение при следующем вызове)
	 */
	resetDataCache() {
		this.#lastSavedDataHash = null;
	}
}
