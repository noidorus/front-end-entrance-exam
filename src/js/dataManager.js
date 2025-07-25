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
			} else if (element.dataset.type === 'number') {
				// Для элементов с data-type="number" сохраняем оригинальное значение
				const originalValue = element.dataset.originalValue;
				const percentageValue = element.dataset.percentageValue;
				const currentText = element.textContent?.trim() || '';
				
				// Если нет data-атрибутов, парсим текущее содержимое
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
			} else if (elementData.type === 'number') {
				this.#restoreNumberContent(element, elementData);
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
	 * Нормализует числовой контент и создает прогресс-бар
	 * @param {HTMLElement} element 
	 */
	normalizeNumberContent(element) {
		const rawValue = element.textContent?.trim() || '';
		let percentage = this.#parseNumberToPercentage(rawValue);
		let displayValue = rawValue;
		
		// Если валидация не прошла, используем значение по умолчанию
		if (percentage === null) {
			percentage = this.#getDefaultPercentage(element);
			displayValue = `${percentage}%`;
			console.warn(`Invalid number input "${rawValue}", using default: ${percentage}%`);
		}
		
		// Сохраняем оригинальное текстовое значение для восстановления при фокусе
		element.dataset.originalValue = displayValue;
		element.dataset.percentageValue = percentage.toString();
		
		// Применяем прогресс-бар стили
		this.#applyProgressMode(element, percentage);
	}

	/**
	 * Восстанавливает текстовое значение при фокусе
	 * @param {HTMLElement} element 
	 */
	restoreNumberText(element) {
		const originalValue = element.dataset.originalValue;
		const percentageValue = element.dataset.percentageValue;
		
		// Убираем прогресс-бар стили
		this.#removeProgressMode(element);
		
		if (originalValue !== undefined) {
			// Восстанавливаем оригинальное значение
			element.textContent = originalValue;
		} else if (percentageValue !== undefined) {
			// Если нет оригинального, показываем процент
			element.textContent = `${percentageValue}%`;
		} else {
			// Если ничего нет, показываем дефолт
			element.textContent = `${this.#getDefaultPercentage(element)}%`;
		}
		
		// Устанавливаем курсор в конец текста
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
	 * Возвращает значение по умолчанию в зависимости от контекста элемента
	 * @param {HTMLElement} element 
	 * @returns {number} процент по умолчанию
	 */
	#getDefaultPercentage(element) {
		// Для языков используем средний уровень
		if (element.classList.contains('language-box__level')) {
			return 50;
		}
		
		// Для навыков используем начальный уровень
		if (element.closest('.tools-box') || element.closest('.skills-box')) {
			return 30;
		}
		
		// По умолчанию средний уровень
		return 60;
	}

	/**
	 * @param {HTMLElement} element - элемент
	 * @param {number} index - индекс элемента
	 * @returns {string} уникальный ключ
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
	 * Извлекает процентное значение из текста
	 * @param {string} text - исходный текст
	 * @returns {number|null} - процент от 0 до 100 или null
	 */
	#parseNumberToPercentage(text) {
		if (!text || typeof text !== 'string') return null;

		// Убираем пробелы
		const trimmedText = text.trim();
		if (!trimmedText) return null;

		// Проверяем, содержит ли строка только буквы (невалидно)
		if (/^[a-zA-Zа-яА-Я\s]+$/.test(trimmedText)) {
			return null;
		}

		// Удаляем все кроме цифр, точек и запятых
		const cleanText = trimmedText.replace(/[^\d.,]/g, '');
		
		if (!cleanText) return null;

		// Заменяем запятые на точки для парсинга
		const numberStr = cleanText.replace(/,/g, '.');
		const number = parseFloat(numberStr);

		if (isNaN(number) || number < 0) return null;

		// Если число больше 1, считаем что это уже процент
		if (number > 1) {
			return Math.min(Math.max(number, 0), 100);
		}
		
		// Если меньше или равно 1, переводим в проценты
		return Math.min(Math.max(number * 100, 0), 100);
	}

	/**
	 * Применяет прогресс-бар стили к элементу
	 * @param {HTMLElement} element - элемент
	 * @param {number} percentage - процент от 0 до 100
	 */
	#applyProgressMode(element, percentage) {
		element.classList.add('progress-mode');
		element.style.setProperty('--progress-width', `${percentage}%`);
		element.textContent = ''; // Очищаем текст, ::after покажет процент
	}

	/**
	 * Убирает прогресс-бар стили с элемента
	 * @param {HTMLElement} element - элемент
	 */
	#removeProgressMode(element) {
		element.classList.remove('progress-mode');
		element.style.removeProperty('--progress-width');
	}

	/**
	 * Восстанавливает данные для элемента с data-type="number"
	 * @param {HTMLElement} element - элемент
	 * @param {Object} elementData - данные элемента
	 */
	#restoreNumberContent(element, elementData) {
		const { originalValue, percentageValue } = elementData;
		
		// Восстанавливаем data-атрибуты
		if (originalValue) {
			element.dataset.originalValue = originalValue;
		}
		if (percentageValue) {
			element.dataset.percentageValue = percentageValue;
		}
		
		// Устанавливаем текстовое содержимое (будет заменено на прогресс-бар при инициализации)
		element.textContent = originalValue || `${percentageValue}%` || '';
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
