import { notificationManager } from './notificationManager.js';

export default class PDFGenerator {
	static BUTTON_SELECTOR = '#savePdfBtn';
	static PDF_OPTIONS = {
		margin: 0,
		filename: 'resume.pdf',
		image: { type: 'jpeg', quality: 0.98 },
		html2canvas: { 
			scale: 2,
			useCORS: true,
			allowTaint: true
		},
		jsPDF: { 
			unit: 'mm', 
			format: 'a4', 
			orientation: 'portrait' 
		}
	};

	static init() {
		const pdfButton = document.querySelector(PDFGenerator.BUTTON_SELECTOR);
		if (pdfButton) {
			new PDFGenerator(pdfButton);
		} else {
			console.warn('PDF button not found');
		}
	}

	/** @param {HTMLElement} button */
	constructor(button) {
		this.button = button;
		this.#attachEventListener();
	}

	#attachEventListener() {
		this.button.addEventListener('click', this.#handleClick.bind(this));
	}

	/** @param {Event} event */
	async #handleClick(event) {
		event.preventDefault();

		if (!window.html2pdf) {
			notificationManager.showError('PDF library not loaded', 3000);
			return;
		}

		const resumeContainer = document.querySelector('#app');
		if (!resumeContainer) {
			notificationManager.showError('Resume container not found', 3000);
			return;
		}

		try {
			notificationManager.showSaving('Generating PDF...', 'pdf-generator');
			
			await window.html2pdf()
				.set(PDFGenerator.PDF_OPTIONS)
				.from(resumeContainer)
				.save();

			notificationManager.showSuccess('PDF downloaded successfully!', 3000, 'pdf-generator');
		} catch (error) {
			console.error('PDF generation error:', error);
			notificationManager.showError('Failed to generate PDF', 3000, 'pdf-generator');
		}
	}
} 