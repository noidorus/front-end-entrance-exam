export class DataManager {
	/** @type {string} */
	#storageKey;
	/** @type {string|null} */
	#lastSavedDataHash = null;

	/** @param {string} storageKey */
	constructor(storageKey) {
		this.#storageKey = storageKey;
	}

	/** @returns {Object|null} */
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
	 * @param {Object} data 
	 * @returns {boolean} 
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
	 * @param {HTMLElement[]} elements 
	 * @returns {Object} 
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
			} else if (element.dataset.type === 'number') {
				const originalValue = element.dataset.originalValue;
				const percentageValue = element.dataset.percentageValue;
				const currentText = element.textContent?.trim() || '';
				
				let valueToSave = originalValue || currentText;
				let percentageToSave = percentageValue;
				
				if (!percentageToSave && currentText) {
					const parsed = this.#parseNumberToPercentage(currentText);
					percentageToSave = parsed ? parsed.toString() : '0';
				}
				
				data[elementKey] = {
					type: 'number',
					originalValue: valueToSave,
					percentageValue: percentageToSave || '0',
				};
			} else {
				let htmlData = element.innerHTML;
				
				if (htmlData.includes('material-wave-ripple')) {
					const tempDiv = document.createElement('div');
					tempDiv.innerHTML = htmlData;
					tempDiv.querySelectorAll('.material-wave-ripple').forEach(ripple => ripple.remove());
					htmlData = tempDiv.innerHTML;
				}
				
				data[elementKey] = { data: htmlData };
			}
		});

		return data;
	}

	/** 
	 * @param {HTMLElement[]} elements 
	 * @param {Object} data 
	 */
	restoreElementsData(elements, data) {
		elements.forEach((element, index) => {
			const elementKey = this.#generateElementKey(element, index);
			const elementData = data[elementKey];

			if (!elementData) return;

			if (elementData.type === 'list') {
				this.#restoreListContent(element, elementData.data);
			} else if (elementData.type === 'number') {
				this.#restoreNumberContent(element, elementData);
			} else {
				this.#sanitizeAndSetContent(element, elementData.data);
			}
		});
	}

	/** @param {HTMLElement} element */
	normalizeListContent(element) {
		const listContent = this.#parseListContent(element);
		const normalizedContent = listContent
			.map((item) => `<li>${this.#escapeHtml(item)}</li>`)
			.join('');

		element.innerHTML = normalizedContent;
	}

	/** @param {HTMLElement} element */
	normalizeNumberContent(element) {
		const rawValue = element.textContent?.trim() || '';
		let percentage = this.#parseNumberToPercentage(rawValue);
		let displayValue = rawValue;
		
		if (percentage === null) {
			percentage = this.#getDefaultPercentage(element);
			displayValue = `${percentage}%`;
			console.warn(`Invalid number input "${rawValue}", using default: ${percentage}%`);
		}
		
		element.dataset.originalValue = displayValue;
		element.dataset.percentageValue = percentage.toString();
		
		this.#applyProgressMode(element, percentage);
	}

	/** @param {HTMLElement} element */
	restoreNumberText(element) {
		const originalValue = element.dataset.originalValue;
		const percentageValue = element.dataset.percentageValue;
		
		this.#removeProgressMode(element);
		
		if (originalValue !== undefined) {
			element.textContent = originalValue;
		} else if (percentageValue !== undefined) {
			element.textContent = `${percentageValue}%`;
		} else {
			element.textContent = `${this.#getDefaultPercentage(element)}%`;
		}
		
		setTimeout(() => {
			if (element === document.activeElement) {
				const range = document.createRange();
				const selection = window.getSelection();
				range.selectNodeContents(element);
				range.collapse(false);
				selection.removeAllRanges();
				selection.addRange(range);
			}
		}, 0);
	}

	/** 
	 * @param {HTMLElement} element 
	 * @returns {number} 
	 */
	#getDefaultPercentage(element) {
		if (element.classList.contains('language-box__level')) return 50;
		if (element.closest('.tools-box') || element.closest('.skills-box')) return 30;
		return 60;
	}

	/** 
	 * @param {HTMLElement} element 
	 * @param {number} index 
	 * @returns {string} 
	 */
	#generateElementKey(element, index) {
		const classList = Array.from(element.classList)
			.filter(cls => 
				!cls.startsWith('material-wave') && 
				cls !== 'editing' && 
				cls !== 'progress-mode'
			)
			.sort()
			.join(' ');
		
		const className = classList || 'no-class';
		const id = element.id || 'no-id';
		const tagName = element.tagName.toLowerCase();
		
		return `${tagName}-${className}-${id}-${index}`;
	}

	/** 
	 * @param {HTMLElement} element 
	 * @param {string[]} data 
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
	 * @param {HTMLElement} element 
	 * @param {string} content 
	 */
	#sanitizeAndSetContent(element, content) {
		if (typeof content !== 'string') return;
		element.innerHTML = content;
	}

	/** 
	 * @param {string} text 
	 * @returns {string} 
	 */
	#escapeHtml(text) {
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}

	/** 
	 * @param {HTMLElement} element 
	 * @returns {string[]} 
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
	 * @param {string} text 
	 * @returns {number|null} 
	 */
	#parseNumberToPercentage(text) {
		if (!text || typeof text !== 'string') return null;

		const trimmedText = text.trim();
		if (!trimmedText) return null;

		if (/^[a-zA-Zа-яА-Я\s]+$/.test(trimmedText)) return null;

		const cleanText = trimmedText.replace(/[^\d.,]/g, '');
		if (!cleanText) return null;

		const numberStr = cleanText.replace(/,/g, '.');
		const number = parseFloat(numberStr);

		if (isNaN(number) || number < 0) return null;

		return number > 1 
			? Math.min(Math.max(number, 0), 100)
			: Math.min(Math.max(number * 100, 0), 100);
	}

	/** 
	 * @param {HTMLElement} element 
	 * @param {number} percentage 
	 */
	#applyProgressMode(element, percentage) {
		element.classList.add('progress-mode');
		element.style.setProperty('--progress-width', `${percentage}%`);
		element.textContent = '';
	}

	/** @param {HTMLElement} element */
	#removeProgressMode(element) {
		element.classList.remove('progress-mode');
		element.style.removeProperty('--progress-width');
	}

	/** 
	 * @param {HTMLElement} element 
	 * @param {Object} elementData 
	 */
	#restoreNumberContent(element, elementData) {
		const { originalValue, percentageValue } = elementData;
		
		if (originalValue) element.dataset.originalValue = originalValue;
		if (percentageValue) element.dataset.percentageValue = percentageValue;
		
		element.textContent = originalValue || `${percentageValue}%` || '';
	}

	/** 
	 * @param {Object} data 
	 * @returns {string} 
	 */
	#calculateDataHash(data) {
		const sortedData = this.#deepSortObject(data);
		const dataString = JSON.stringify(sortedData);
		return this.#simpleHash(dataString);
	}

	/** 
	 * @param {any} obj 
	 * @returns {any} 
	 */
	#deepSortObject(obj) {
		if (obj === null || typeof obj !== 'object') return obj;
		if (Array.isArray(obj)) return obj.map(item => this.#deepSortObject(item));
		
		const sortedObj = {};
		const sortedKeys = Object.keys(obj).sort();
		
		for (const key of sortedKeys) {
			sortedObj[key] = this.#deepSortObject(obj[key]);
		}
		
		return sortedObj;
	}

	/** 
	 * @param {string} str 
	 * @returns {string} 
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

	resetDataCache() {
		this.#lastSavedDataHash = null;
	}
}
