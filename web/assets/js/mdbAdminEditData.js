document.addEventListener('DOMContentLoaded', editDataInit);

function editDataInit() {
    const editDataTypeSelect = document.getElementById('edit-data-type');
    const editDataFields = document.getElementById('edit-data-fields');
    const editDataForm = document.getElementById('edit-data-form');

    editDataTypeSelect.addEventListener('change', () => handleDataTypeChange(editDataTypeSelect, editDataFields));
    editDataTypeSelect.dispatchEvent(new Event('change'));

    editDataForm.addEventListener('submit', (e) => handleFormSubmit(e, editDataForm));

    async function handleDataTypeChange(editDataTypeSelect, editDataFields) {
        const type = editDataTypeSelect.value;
        editDataFields.innerHTML = '';

        switch (type) {
            case 'series':
                await addSeriesSelect();
                addFormDescription(editDataFields, 'DB Data');
                addInputField('name', 'Series Name');
                addInputField('img', 'Image URL');
                await seriesData();
                break;
            case 'books':
                await addSeriesSelect(true);
                addFormDescription(editDataFields, 'DB Data');
                addInputField('name', 'Book Name');
                addInputField('startedReading', 'Started Reading', 'date');
                addInputField('endedReading', 'Ended Reading', 'date');
                await bookData();
                break;
            case 'chapters':
                await addSeriesSelect(true, true);
                addFormDescription(editDataFields, 'DB Data');
                addInputField('name', 'Chapter Name');
                addInputField('date', 'Date', 'date');
                await chapterData();
                break;
        }
    }

    async function addSeriesSelect(books = false, chapters = false) {
        try {
            editDataFields.innerHTML = '';
            addFormDescription(editDataFields, 'Select reference');
    
            const seriesSelect = createSelectElement('series_id');
            editDataFields.appendChild(seriesSelect);
    
            const series = await fetchData('/list-series');
            await populateSelect(seriesSelect, series, 'name', 'series_id');
    
            if (books) {
                const bookSelect = createSelectElement('book_id');
                editDataFields.appendChild(bookSelect);
    
                seriesSelect.addEventListener('change', async () => await handleSeriesChange(seriesSelect, bookSelect, chapters));
                await handleSeriesChange(seriesSelect, bookSelect, chapters); 
            }
        } catch (error) {
            console.error(error);
        }
    }
    
    async function handleSeriesChange(seriesSelect, bookSelect, chapters) {
        const seriesId = seriesSelect.value;
        const books = await fetchData(`/list-books/${seriesId}`);
        if (!books.length) {
            showNotification('No books found for this series', 'warning');
            resetToSeries();
        } else {
            await populateSelect(bookSelect, books, 'name', 'book_id');
            if (chapters) {
                await handleBookChange(bookSelect);
                const chapterSelect = editDataFields.querySelector('select[name="chapter_id"]');
                chapterSelect.dispatchEvent(new Event('change'));
            }
            bookSelect.dispatchEvent(new Event('change'));
        }
    }
    
    async function handleBookChange(bookSelect) {
        let chapterSelect = editDataFields.querySelector('select[name="chapter_id"]');
        if (!chapterSelect) {
            chapterSelect = createSelectElement('chapter_id');
            bookSelect.insertAdjacentElement('afterend', chapterSelect);
        }
    
        return new Promise((resolve) => {
            bookSelect.addEventListener('change', async function () {
                const bookId = this.value;
                const chapters = await fetchData(`/list-chapters/${bookId}`);
                if (!chapters.length) {
                    resetToSeries();
                    showNotification('No chapters found for this book', 'warning');
                } else {
                    await populateSelect(chapterSelect, chapters, 'name', 'chapter_id');
                    chapterSelect.dispatchEvent(new Event('change')); 
                }
                resolve();
            });
            bookSelect.dispatchEvent(new Event('change'));
        });
    }

    function resetToSeries() {
        editDataTypeSelect.value = 'series';
        editDataTypeSelect.dispatchEvent(new Event('change'));
    }

    function addFormDescription(container, text) {
        const description = document.createElement('label');
        description.textContent = text;
        description.className = 'block text-gray-700 dark:text-gray-200 text-sm font-bold mb-2';
        container.appendChild(description);
    }

    function addInputField(name, placeholder, type = 'text') {
        const inputHtml = `
            <div class="mb-3">
                <input 
                    type="${type}" 
                    name="${name}" 
                    placeholder="${placeholder}" 
                    class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-800 leading-tight focus:outline-none focus:shadow-outline"
                >
            </div>`;
        editDataFields.insertAdjacentHTML('beforeend', inputHtml);
    }

    async function seriesData() {
        const seriesSelectDL = editDataFields.querySelector('select[name="series_id"]');
        seriesSelectDL.addEventListener('change', async function () {
            const seriesId = this.value;
            loadOldData('series', seriesId);
        });
        seriesSelectDL.dispatchEvent(new Event('change'));
    }

    async function bookData() {
        const bookSelectDL = editDataFields.querySelector('select[name="book_id"]');
        bookSelectDL.addEventListener('change', async function () {
            const bookId = this.value;
            loadOldData('books', bookId);
        });
        bookSelectDL.dispatchEvent(new Event('change'));
    }

    async function chapterData() {
        const chapterSelectDL = editDataFields.querySelector('select[name="chapter_id"]');
        chapterSelectDL.addEventListener('change', async function () {
            const chapterId = this.value;
            loadOldData('chapters', chapterId);
        });
        chapterSelectDL.dispatchEvent(new Event('change'));
    }

    async function loadOldData(type, id) {
        const typeMapping = {
            series: {
                endpoint: `/series/${id}`,
                fields: {
                    'name': 'name',
                    'img': 'img'
                }
            },
            books: {
                endpoint: `/book/${id}`,
                fields: {
                    'name': 'name',
                    'startedReading': 'startedReading',
                    'endedReading': 'endedReading'
                }
            },
            chapters: {
                endpoint: `/chapter/${id}`,
                fields: {
                    'name': 'name',
                    'date': 'date'
                }
            }
        };
    
        if (typeMapping[type]) {
            const { endpoint, fields } = typeMapping[type];
            const data = await fetchData(endpoint);
    
            for (const [field, key] of Object.entries(fields)) {
                editDataFields.querySelector(`input[name="${field}"]`).value = data[key] || '';
            }
        }
    }

    function createSelectElement(name) {
        const select = document.createElement('select');
        select.name = name;
        select.required = true;
        select.classList.add('shadow', 'border', 'rounded', 'w-full', 'py-2', 'px-3', 'text-gray-700', 'dark:text-gray-300', 'dark:bg-gray-800', 'leading-tight', 'focus:outline-none', 'focus:shadow-outline', 'mb-3');
        return select;
    }

    async function populateSelect(select, data, textKey, valueKey) {
        select.innerHTML = '';
        data.forEach(d => {
            const option = new Option(d[textKey], d[valueKey]);
            select.add(option);
        });
    }

    async function fetchData(path) {
        const response = await fetch(api + path);
        return await response.json();
    }

    async function handleFormSubmit(e, form) {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        const type = data.type;
        delete data.type;

        if (type === 'chapters') {
            delete data.series_id;
        }

        const id = data.chapter_id || data.book_id || data.series_id;

        try {
            const response = await fetch(api + `/update-data/${type}/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'authorization': getCookie('sessionToken')
                },
                body: JSON.stringify(data)
            });

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.msg || 'Failed to update data');
            }

            refreshContent()
            showNotification(responseData.msg, 'success');
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }
}
