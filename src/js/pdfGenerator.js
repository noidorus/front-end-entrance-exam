import '../css/save-pdf-btn.css'
import { notificationManager } from './notificationManager.js';

class PDFGenerator {
    constructor() {
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.attachEventListener();
            });
        } else {
            this.attachEventListener();
        }
    }

    attachEventListener() {
        const saveBtn = document.getElementById('savePdfBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.generatePDF());
        } else {
            console.error('PDF save button not found');
        }
    }

    async generatePDF() {
        const element = document.getElementById('app');
        const saveBtn = document.getElementById('savePdfBtn');
        
        if (!element) {
            console.error('Элемент для сохранения не найден');
            return;
        }

        if (typeof window.html2pdf === 'undefined') {
            console.error('HTML2PDF библиотека не загружена');
            notificationManager.showError('Ошибка: PDF библиотека не загружена');
            return;
        }

        this.setLoadingState(saveBtn, true);

        try {
            const nameElement = document.querySelector('.name-box__name');
            const userName = nameElement ? nameElement.textContent.trim() : 'Resume';
            const filename = `${userName.replace(/\s+/g, '_')}_Resume.pdf`;

            const options = {
                margin: 1,
                filename: filename,
                image: { 
                    type: 'jpeg', 
                    quality: 0.9 
                },
                html2canvas: { 
                    scale: 1.5,
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: '#ffffff',
                    logging: true,
                    width: element.scrollWidth,
                    height: element.scrollHeight
                },
                jsPDF: { 
                    unit: 'mm', 
                    format: 'a4', 
                    orientation: 'portrait'
                }
            };

            const pdfControls = document.querySelector('.pdf-controls');
            if (pdfControls) {
                pdfControls.style.display = 'none';
            }

            const worker = window.html2pdf();
            await worker.set(options).from(element).save();

            notificationManager.showSuccess('PDF успешно сохранен!');

        } catch (error) {
            console.error('Ошибка при генерации PDF:', error);
            notificationManager.showError('Ошибка при сохранении PDF');
        } finally {
            const pdfControls = document.querySelector('.pdf-controls');
            if (pdfControls) {
                pdfControls.style.display = 'block';
            }
            
            this.setLoadingState(saveBtn, false);
        }
    }

    setLoadingState(button, isLoading) {
        if (!button) return;

        if (isLoading) {
            button.disabled = true;
            button.innerHTML = '⏳ Генерация PDF...';
            button.style.opacity = '0.7';
        } else {
            button.disabled = false;
            button.innerHTML = '📄 Сохранить как PDF';
            button.style.opacity = '1';
        }
    }

    setCustomOptions(customOptions) {
        this.customOptions = customOptions;
    }

    static init() {
        return new PDFGenerator();
    }
}

export default PDFGenerator; 