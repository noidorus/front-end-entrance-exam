import '../css/save-pdf-btn.css'

class PDFGenerator {
    constructor() {
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Ждем полной загрузки DOM
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
            console.log('PDF generator initialized successfully');
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

        // Проверяем наличие html2pdf библиотеки
        if (typeof window.html2pdf === 'undefined') {
            console.error('HTML2PDF библиотека не загружена');
            this.showNotification('Ошибка: PDF библиотека не загружена', 'error');
            return;
        }

        // Показываем индикатор загрузки
        this.setLoadingState(saveBtn, true);

        try {
            // Проверяем, что элемент содержит контент
            console.log('Generating PDF for element:', element);
            console.log('Element content:', element.innerHTML.substring(0, 100) + '...');

            // Получаем имя пользователя для названия файла
            const nameElement = document.querySelector('.name-box__name');
            const userName = nameElement ? nameElement.textContent.trim() : 'Resume';
            const filename = `${userName.replace(/\s+/g, '_')}_Resume.pdf`;

            // Упрощенные настройки для HTML2PDF
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

            // Временно скрываем кнопку PDF для чистого вида
            const pdfControls = document.querySelector('.pdf-controls');
            if (pdfControls) {
                pdfControls.style.display = 'none';
            }

            console.log('Starting PDF generation with options:', options);

            // Генерируем PDF с дополнительными проверками
            const worker = window.html2pdf();
            await worker.set(options).from(element).save();

            // Показываем уведомление об успехе
            this.showNotification('PDF успешно сохранен!', 'success');

        } catch (error) {
            console.error('Ошибка при генерации PDF:', error);
            this.showNotification('Ошибка при сохранении PDF', 'error');
        } finally {
            // Возвращаем кнопку PDF
            const pdfControls = document.querySelector('.pdf-controls');
            if (pdfControls) {
                pdfControls.style.display = 'block';
            }
            
            // Убираем индикатор загрузки
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

    showNotification(message, type = 'info') {
        // Создаем уведомление
        const notification = document.createElement('div');
        notification.className = `pdf-notification pdf-notification--${type}`;
        notification.textContent = message;

        // Стили для уведомления
        Object.assign(notification.style, {
            position: 'fixed',
            top: '80px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '8px',
            color: 'white',
            fontFamily: 'Poppins, sans-serif',
            fontSize: '14px',
            fontWeight: '500',
            zIndex: '1001',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease',
            backgroundColor: type === 'success' ? '#28d979' : '#ff4757',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
        });

        // Добавляем в DOM
        document.body.appendChild(notification);

        // Анимация появления
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Автоматическое удаление через 3 секунды
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Метод для настройки PDF опций извне
    setCustomOptions(customOptions) {
        this.customOptions = customOptions;
    }

    // Статический метод для инициализации
    static init() {
        return new PDFGenerator();
    }
}

export default PDFGenerator; 