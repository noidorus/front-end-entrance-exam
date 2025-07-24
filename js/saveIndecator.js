import '../css/save-indicator.css';

export class SaveIndicator {
	constructor() {
		this.indicatorElement = null;
		this.#createIndicator();
	}

	#createIndicator() {
		this.indicatorElement = document.createElement('div');
		this.indicatorElement.id = 'save-indicator';
		this.indicatorElement.className = 'save-indicator';
		document.body.appendChild(this.indicatorElement);
	}


	showSuccess(message = '✓ Saved', duration = 2000) {
		this.indicatorElement.textContent = message;
		this.indicatorElement.className = 'save-indicator success show';

		setTimeout(() => {
			this.indicatorElement.className = 'save-indicator success';
		}, duration);
	}

	showError(message = '⚠ Error saving', duration = 3000) {
		this.indicatorElement.textContent = message;
		this.indicatorElement.className = 'save-indicator error show';

		setTimeout(() => {
			this.indicatorElement.className = 'save-indicator error';
		}, duration);
	}

	showSaving(message = '💾 Saving...') {
		this.indicatorElement.textContent = message;
		this.indicatorElement.className = 'save-indicator saving show';
	}

	hide() {
		this.indicatorElement.className = 'save-indicator';
	}

	destroy() {
		if (this.indicatorElement) {
			this.indicatorElement.remove();
			this.indicatorElement = null;
		}
	}
}
