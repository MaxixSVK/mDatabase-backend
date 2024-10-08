document.addEventListener('DOMContentLoaded', addDataInit);

function addDataInit() {
    const addDataTypeSelect = document.getElementById('add-data-type');
    const addDataFieldsDiv = document.getElementById('add-data-fields');
    const addDataForm = document.getElementById('add-data-form');

    addDataTypeSelect.addEventListener('change', () => handleDataTypeChange(addDataTypeSelect, addDataFieldsDiv));
    addDataTypeSelect.dispatchEvent(new Event('change'));

    addDataForm.addEventListener('submit', (e) => handleFormSubmit(e, addDataForm));

    async function handleDataTypeChange(addDataTypeSelect, addDataFieldsDiv) {
        const type = addDataTypeSelect.value;
        addDataFieldsDiv.innerHTML = '';

        switch (type) {
            case 'series':
                addFormDescription(addDataFieldsDiv, 'New DB Data:');
                addInputField(addDataFieldsDiv, 'name', 'Series Name');
                addInputField(addDataFieldsDiv, 'img', 'Image URL');
                addTypeSelect(addDataFieldsDiv);
                break;
            case 'books':
                addFormDescription(addDataFieldsDiv, 'Select reference');
                await addSeriesSelect(addDataFieldsDiv);
                addFormDescription(addDataFieldsDiv, 'New DB Data');
                addInputField(addDataFieldsDiv, 'name', 'Book Name');
                addInputField(addDataFieldsDiv, 'startedReading', 'Started Reading', 'date');
                addInputField(addDataFieldsDiv, 'endedReading', 'Ended Reading', 'date');
                break;
            case 'chapters':
                addFormDescription(addDataFieldsDiv, 'Select reference');
                await addSeriesSelect(addDataFieldsDiv, true);
                addFormDescription(addDataFieldsDiv, 'New DB Data');
                addInputField(addDataFieldsDiv, 'name', 'Chapter Name');
                addInputField(addDataFieldsDiv, 'date', 'Date', 'date');
                break;
        }
    }

    function addFormDescription(container, text) {
        const description = document.createElement('label');
        description.textContent = text;
        description.className = 'block text-gray-700 dark:text-gray-200 text-sm font-bold mb-2';
        container.appendChild(description);
    }

    function addInputField(container, name, placeholder, type = 'text') {
        const inputHtml = `
            <div class="mb-3">
                <input 
                    type="${type}" 
                    name="${name}" 
                    placeholder="${placeholder}" 
                    class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-800 leading-tight focus:outline-none focus:shadow-outline"
                >
            </div>`;
        container.insertAdjacentHTML('beforeend', inputHtml);
    }

    async function addSeriesSelect(container, withBooks = false) {
        try {
            const seriesSelect = createSelectElement('series_id');
            container.appendChild(seriesSelect);

            const series = await fetchData('/list-series');
            populateSelect(seriesSelect, series, 'name', 'series_id');

            if (withBooks) {
                const bookSelect = createSelectElement('book_id');
                container.appendChild(bookSelect);
                await updateBookSelect(seriesSelect, bookSelect);

                seriesSelect.addEventListener('change', () => updateBookSelect(seriesSelect, bookSelect));
            }
        } catch (error) {
            console.error(error);
        }
    }

    function createSelectElement(name) {
        const select = document.createElement('select');
        select.name = name;
        select.required = true;
        select.classList.add('shadow', 'border', 'rounded', 'w-full', 'py-2', 'px-3', 'text-gray-700', 'dark:text-gray-300', 'dark:bg-gray-800', 'leading-tight', 'focus:outline-none', 'focus:shadow-outline', 'mb-3');
        return select;
    }

    async function updateBookSelect(seriesSelect, bookSelect) {
        bookSelect.innerHTML = '';

        try {
            const seriesId = seriesSelect.value;
            const books = await fetchData(`/list-books/${seriesId}`);
            if (!books.length) {
                showNotification('No books found for this series', 'warning');
                addDataTypeSelect.value = 'series';
                addDataTypeSelect.dispatchEvent(new Event('change'));
            }
            populateSelect(bookSelect, books, 'name', 'book_id');
        } catch (error) {
            console.error(error);
        }
    }

    function populateSelect(select, items, textKey, valueKey) {
        items.forEach(item => {
            const option = new Option(item[textKey], item[valueKey]);
            select.add(option);
        });
    }

    function addTypeSelect(container) {
        const typeSelect = createSelectElement('seriesType');
        container.appendChild(typeSelect);

        const types = ['manga', 'lightNovel'];
        const names = ['Manga', 'Light Novel'];
        types.forEach((type, index) => {
            const option = new Option(names[index], type);
            typeSelect.add(option);
        });
    }

    async function fetchData(endpoint) {
        const response = await fetch(api + endpoint);
        if (!response.ok) {
            throw new Error(`Error: ${response.statusText}`);
        }
        return response.json();
    }

    async function handleFormSubmit(event, form) {
        event.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        const type = data.type;
        delete data.type;

        if (type === 'chapters') {
            delete data.series_id;
        }

        try {
            const response = await fetch(api + '/add-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'authorization': getCookie('sessionToken')
                },
                body: JSON.stringify({ type, ...data })
            });

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.msg);
            }

            refreshContent()
            showNotification(responseData.msg, 'success');
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }
}