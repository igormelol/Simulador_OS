// --- Global Variables ---
let desktop, taskbar, windowTemplate, startMenuTemplate, notepadIcon, folderIcon;
let runningAppsContainer, currentTimeSpan, startButton, messageBox, messageText, closeMessageBoxBtn;

// --- OS State Variables ---
let openWindows = [];
let zIndexCounter = 100;
let isDragging = false;
let isResizing = false;
let currentDragWindow = null;
let currentResizeWindow = null;
let dragOffsetX, dragOffsetY;
let resizeStartX, resizeStartY, resizeStartWidth, resizeStartHeight;
let startMenu = null;

// --- Application Data ---
const appData = {
    notepad: {
        content: localStorage.getItem('notepadContent') || 'Bem-vindo ao Bloco de Notas!\n\nDigite aqui suas anotações.',
        windowId: null
    },
    folder: {
        items: [
            { name: 'Documento1.txt', icon: 'https://placehold.co/30x30/CCCCFF/000000?text=DOC' },
            { name: 'Imagem.jpg', icon: 'https://placehold.co/30x30/FFCC99/000000?text=IMG' },
            { name: 'Planilha.xls', icon: 'https://placehold.co/30x30/CCFFCC/000000?text=XLS' }
        ],
        windowId: null
    }
};

// --- Helper Functions ---
function showMessage(message) {
    messageText.textContent = message;
    messageBox.style.display = 'flex';
}

function hideMessage() {
    messageBox.style.display = 'none';
}

function updateCurrentTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    currentTimeSpan.textContent = `${hours}:${minutes}`;
}

function createWindow(id, title, type, contentHtml) {
    console.log(`Criando janela: ${title} (${id})`);
    const newWindow = windowTemplate.content.cloneNode(true).firstElementChild;
    newWindow.id = id;
    newWindow.style.display = 'flex';
    newWindow.style.left = `${50 + Math.random() * 50}px`;
    newWindow.style.top = `${50 + Math.random() * 50}px`;
    newWindow.style.zIndex = ++zIndexCounter;
    newWindow.dataset.type = type;

    newWindow.querySelector('.window-title').textContent = title;
    const windowContent = newWindow.querySelector('.window-content');
    windowContent.innerHTML = contentHtml;

    desktop.appendChild(newWindow);
    openWindows.push(newWindow);

    newWindow.querySelector('.close-btn').addEventListener('click', () => closeWindow(newWindow));
    newWindow.querySelector('.minimize-btn').addEventListener('click', () => minimizeWindow(newWindow));
    newWindow.querySelector('.maximize-btn').addEventListener('click', () => maximizeWindow(newWindow));
    newWindow.addEventListener('mousedown', () => bringWindowToFront(newWindow));

    const titleBar = newWindow.querySelector('.window-title-bar');
    titleBar.addEventListener('mousedown', startDragging);
    const resizeHandle = newWindow.querySelector('.resize-handle');
    if (resizeHandle) {
        resizeHandle.addEventListener('mousedown', startResizing);
    }

    addAppToTaskbar(id, title);
    return newWindow;
}

function bringWindowToFront(windowEl) {
    windowEl.style.zIndex = ++zIndexCounter;
    const appIcon = runningAppsContainer.querySelector(`[data-window-id="${windowEl.id}"]`);
    if (appIcon) appIcon.classList.add('active');
}

function closeWindow(windowEl) {
    if (windowEl && windowEl.parentNode) {
        desktop.removeChild(windowEl);
        openWindows = openWindows.filter(w => w !== windowEl);
        removeAppFromTaskbar(windowEl.id);
        if (windowEl.dataset.type === 'notepad') appData.notepad.windowId = null;
        if (windowEl.dataset.type === 'folder') appData.folder.windowId = null;
    }
}

function minimizeWindow(windowEl) {
    if (windowEl) {
        windowEl.style.display = 'none';
        const appIcon = runningAppsContainer.querySelector(`[data-window-id="${windowEl.id}"]`);
        if (appIcon) appIcon.classList.remove('active');
    }
}

function maximizeWindow(windowEl) {
    if (!windowEl) return;
    
    if (windowEl.style.width === '100%' && windowEl.style.height === 'calc(100% - 40px)') {
        windowEl.style.width = '50%';
        windowEl.style.height = '50%';
        windowEl.style.left = '25%';
        windowEl.style.top = '25%';
    } else {
        windowEl.style.width = '100%';
        windowEl.style.height = 'calc(100% - 40px)';
        windowEl.style.left = '0';
        windowEl.style.top = '0';
    }
    bringWindowToFront(windowEl);
}

function startDragging(e) {
    isDragging = true;
    currentDragWindow = e.target.closest('.window');
    if (!currentDragWindow) return;
    
    dragOffsetX = e.clientX - currentDragWindow.offsetLeft;
    dragOffsetY = e.clientY - currentDragWindow.offsetTop;
    bringWindowToFront(currentDragWindow);
}

function startResizing(e) {
    isResizing = true;
    currentResizeWindow = e.target.closest('.window');
    if (!currentResizeWindow) return;
    
    resizeStartX = e.clientX;
    resizeStartY = e.clientY;
    resizeStartWidth = currentResizeWindow.offsetWidth;
    resizeStartHeight = currentResizeWindow.offsetHeight;
    bringWindowToFront(currentResizeWindow);
}

function handleMouseMove(e) {
    if (isDragging && currentDragWindow) {
        const newX = e.clientX - dragOffsetX;
        const newY = e.clientY - dragOffsetY;
        currentDragWindow.style.left = `${newX}px`;
        currentDragWindow.style.top = `${newY}px`;
    }
    if (isResizing && currentResizeWindow) {
        const dx = e.clientX - resizeStartX;
        const dy = e.clientY - resizeStartY;
        currentResizeWindow.style.width = `${Math.max(250, resizeStartWidth + dx)}px`;
        currentResizeWindow.style.height = `${Math.max(150, resizeStartHeight + dy)}px`;
    }
}

function handleMouseUp() {
    isDragging = false;
    isResizing = false;
    currentDragWindow = null;
    currentResizeWindow = null;
}

function addAppToTaskbar(windowId, title) {
    if (!runningAppsContainer) return;
    
    // Remove existing app icon if it exists
    const existingIcon = runningAppsContainer.querySelector(`[data-window-id="${windowId}"]`);
    if (existingIcon) {
        existingIcon.remove();
    }
    
    const appIcon = document.createElement('div');
    appIcon.classList.add('running-app-icon');
    appIcon.dataset.windowId = windowId;
    appIcon.innerHTML = `
        <img src="https://placehold.co/30x30/FF0000/000000?text=APP" alt="${title}">
        <span>${title}</span>
    `;
    runningAppsContainer.appendChild(appIcon);

    appIcon.addEventListener('click', () => {
        const windowEl = document.getElementById(windowId);
        if (windowEl) {
            if (windowEl.style.display === 'none') {
                windowEl.style.display = 'flex';
                bringWindowToFront(windowEl);
            } else if (windowEl.style.display === 'flex') {
                minimizeWindow(windowEl);
            }
        }
    });

    appIcon.classList.add('active');
}

function removeAppFromTaskbar(windowId) {
    const appIcon = runningAppsContainer && runningAppsContainer.querySelector(`[data-window-id="${windowId}"]`);
    if (appIcon) appIcon.remove();
}

// --- Menu Iniciar ---
function toggleStartMenu() {
    if (!startMenu) {
        startMenu = startMenuTemplate.content.cloneNode(true).firstElementChild;
        startMenu.style.display = 'block';
        taskbar.appendChild(startMenu);

        // Add event listeners to start menu items
        startMenu.querySelectorAll('.start-menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                if (item.id === 'logout') {
                    showMessage('Sistema encerrado.');
                    setTimeout(() => hideMessage(), 2000);
                } else if (item.textContent.includes('Bloco de Notas')) {
                    openNotepad();
                } else if (item.textContent.includes('Meus Documentos')) {
                    openFolder();
                }
                startMenu.style.display = 'none';
            });
        });
        
        // Close menu when clicking outside
        setTimeout(() => {
            document.addEventListener('click', function closeMenu(e) {
                if (!startMenu.contains(e.target) && e.target !== startButton) {
                    startMenu.style.display = 'none';
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 0);
    } else {
        startMenu.style.display = startMenu.style.display === 'none' ? 'block' : 'none';
    }
}

// --- Application Specific Functions ---
function openNotepad() {
    console.log('Abrindo Bloco de Notas...');
    if (appData.notepad.windowId && document.getElementById(appData.notepad.windowId)) {
        const existingWindow = document.getElementById(appData.notepad.windowId);
        if (existingWindow.style.display === 'none') {
            existingWindow.style.display = 'flex';
        }
        bringWindowToFront(existingWindow);
        return;
    }

    const notepadWindowId = `notepad-window-${Date.now()}`;
    const contentHtml = `
        <div class="notepad-toolbar">
            <button>Arquivo</button>
            <button>Editar</button>
            <button>Formatar</button>
            <button>Exibir</button>
            <button>Ajuda</button>
        </div>
        <textarea class="notepad-textarea">${appData.notepad.content}</textarea>
    `;
    
    const newNotepadWindow = createWindow(notepadWindowId, 'Bloco de Notas', 'notepad', contentHtml);
    appData.notepad.windowId = notepadWindowId;

    const textarea = newNotepadWindow.querySelector('.notepad-textarea');
    textarea.addEventListener('input', (e) => {
        appData.notepad.content = e.target.value;
        localStorage.setItem('notepadContent', appData.notepad.content);
    });
    
    // Focus the textarea when the window is created
    setTimeout(() => {
        textarea.focus();
    }, 100);
}

function openFolder() {
    console.log('Abrindo Meus Documentos...');
    if (appData.folder.windowId && document.getElementById(appData.folder.windowId)) {
        const existingWindow = document.getElementById(appData.folder.windowId);
        if (existingWindow.style.display === 'none') {
            existingWindow.style.display = 'flex';
        }
        bringWindowToFront(existingWindow);
        return;
    }

    const folderWindowId = `folder-window-${Date.now()}`;
    let folderContentHtml = `
        <div class="folder-toolbar">
            <button>Arquivo</button>
            <button>Editar</button>
            <button>Exibir</button>
            <button>Favoritos</button>
            <button>Ferramentas</button>
            <button>Ajuda</button>
        </div>
        <div class="address-bar">
            <span>Endereço: Meus Documentos</span>
        </div>
        <div class="folder-content">
            <div class="folder-view-options">
                <button class="view-option active" data-view="icons"><i class="fas fa-th-large"></i> Ícones</button>
                <button class="view-option" data-view="list"><i class="fas fa-list"></i> Lista</button>
                <button class="view-option" data-view="details"><i class="fas fa-th-list"></i> Detalhes</button>
            </div>
            <div class="folder-items">
    `;
    
    appData.folder.items.forEach(item => {
        folderContentHtml += `
            <div class="folder-item" draggable="true">
                <img src="${item.icon}" alt="${item.name}">
                <span>${item.name}</span>
            </div>
        `;
    });
    
    folderContentHtml += `
            </div>
        </div>
        <div class="status-bar">
            <span>${appData.folder.items.length} objetos</span>
        </div>
    `;

    const newFolderWindow = createWindow(folderWindowId, 'Meus Documentos', 'folder', folderContentHtml);
    appData.folder.windowId = folderWindowId;
    
    // Add event listeners for view options
    newFolderWindow.querySelectorAll('.view-option').forEach(option => {
        option.addEventListener('click', (e) => {
            newFolderWindow.querySelectorAll('.view-option').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            newFolderWindow.querySelector('.folder-items').className = `folder-items view-${e.target.dataset.view}`;
        });
    });
}

// --- Initialize the OS ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('Sistema operacional inicializando...');
    
    try {
        // Get DOM elements
        desktop = document.getElementById('desktop');
        taskbar = document.getElementById('taskbar');
        windowTemplate = document.getElementById('window-template');
        startMenuTemplate = document.getElementById('start-menu-template');
        notepadIcon = document.getElementById('notepad-icon');
        folderIcon = document.getElementById('folder-icon');
        runningAppsContainer = document.getElementById('running-apps-container');
        currentTimeSpan = document.getElementById('current-time');
        startButton = document.getElementById('start-button');
        messageBox = document.getElementById('message-box');
        messageText = document.getElementById('message-text');
        closeMessageBoxBtn = document.getElementById('close-message-btn');

        if (!desktop || !taskbar || !windowTemplate || !startMenuTemplate || !notepadIcon || !folderIcon) {
            throw new Error('Elementos essenciais do DOM não encontrados');
        }

        // Set up event listeners
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        // Message box
        closeMessageBoxBtn.addEventListener('click', hideMessage);
        messageBox.addEventListener('click', (e) => {
            if (e.target === messageBox) hideMessage();
        });

        // Desktop icons
        notepadIcon.addEventListener('dblclick', openNotepad);
        folderIcon.addEventListener('dblclick', openFolder);
        
        // Start button
        startButton.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleStartMenu();
        });

        // Close start menu when clicking on desktop
        desktop.addEventListener('click', () => {
            if (startMenu && startMenu.style.display === 'block') {
                startMenu.style.display = 'none';
            }
        });

        // Initialize clock
        setInterval(updateCurrentTime, 1000);
        updateCurrentTime();
        
        console.log('Sistema operacional inicializado com sucesso!');
    } catch (error) {
        console.error('Erro ao inicializar o sistema operacional:', error);
        alert('Ocorreu um erro ao inicializar o sistema. Por favor, recarregue a página.');
    }
});

// Make functions globally available for debugging
window.openNotepad = openNotepad;
window.openFolder = openFolder;
        }
    };

    // --- Helper Functions ---

    function showMessage(message) {
        messageText.textContent = message;
        messageBox.style.display = 'flex';
    }

    function hideMessage() {
        messageBox.style.display = 'none';
    }

    function updateCurrentTime() {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        currentTimeSpan.textContent = `${hours}:${minutes}`;
    }

    function createWindow(id, title, type, contentHtml) {
        console.log(`Criando janela: ${title} (${id})`);
        const newWindow = windowTemplate.cloneNode(true);
        newWindow.id = id;
        newWindow.style.display = 'flex';
        newWindow.style.left = `${50 + Math.random() * 50}px`;
        newWindow.style.top = `${50 + Math.random() * 50}px`;
        newWindow.style.zIndex = ++zIndexCounter;
        newWindow.dataset.type = type;

        newWindow.querySelector('.window-title').textContent = title;
        const windowContent = newWindow.querySelector('.window-content');
        windowContent.innerHTML = contentHtml;

        desktop.appendChild(newWindow);
        openWindows.push(newWindow);

        newWindow.querySelector('.close-btn').addEventListener('click', () => closeWindow(newWindow));
        newWindow.querySelector('.minimize-btn').addEventListener('click', () => minimizeWindow(newWindow));
        newWindow.querySelector('.maximize-btn').addEventListener('click', () => maximizeWindow(newWindow));
        newWindow.addEventListener('mousedown', () => bringWindowToFront(newWindow));

        const titleBar = newWindow.querySelector('.window-title-bar');
        titleBar.addEventListener('mousedown', startDragging);
        const resizeHandle = newWindow.querySelector('.resize-handle');
        resizeHandle.addEventListener('mousedown', startResizing);

        addAppToTaskbar(id, title);
        return newWindow;
    }

    function bringWindowToFront(windowEl) {
        windowEl.style.zIndex = ++zIndexCounter;
        const appIcon = runningAppsContainer.querySelector(`[data-window-id="${windowEl.id}"]`);
        if (appIcon) appIcon.classList.add('active');
    }

    function closeWindow(windowEl) {
        desktop.removeChild(windowEl);
        openWindows = openWindows.filter(w => w !== windowEl);
        removeAppFromTaskbar(windowEl.id);
        if (windowEl.dataset.type === 'notepad') appData.notepad.windowId = null;
        if (windowEl.dataset.type === 'folder') appData.folder.windowId = null;
    }

    function minimizeWindow(windowEl) {
        windowEl.style.display = 'none';
        const appIcon = runningAppsContainer.querySelector(`[data-window-id="${windowEl.id}"]`);
        if (appIcon) appIcon.classList.remove('active');
    }

    function maximizeWindow(windowEl) {
        if (windowEl.style.width === '100%' && windowEl.style.height === 'calc(100% - 40px)') {
            windowEl.style.width = '50%';
            windowEl.style.height = '50%';
            windowEl.style.left = '25%';
            windowEl.style.top = '25%';
        } else {
            windowEl.style.width = '100%';
            windowEl.style.height = 'calc(100% - 40px)';
            windowEl.style.left = '0';
            windowEl.style.top = '0';
        }
        bringWindowToFront(windowEl);
    }

    function startDragging(e) {
        isDragging = true;
        currentDragWindow = e.target.closest('.window');
        dragOffsetX = e.clientX - currentDragWindow.offsetLeft;
        dragOffsetY = e.clientY - currentDragWindow.offsetTop;
        bringWindowToFront(currentDragWindow);
    }

    function startResizing(e) {
        isResizing = true;
        currentResizeWindow = e.target.closest('.window');
        resizeStartX = e.clientX;
        resizeStartY = e.clientY;
        resizeStartWidth = currentResizeWindow.offsetWidth;
        resizeStartHeight = currentResizeWindow.offsetHeight;
        bringWindowToFront(currentResizeWindow);
    }

    function handleMouseMove(e) {
        if (isDragging && currentDragWindow) {
            const newX = e.clientX - dragOffsetX;
            const newY = e.clientY - dragOffsetY;
            currentDragWindow.style.left = `${newX}px`;
            currentDragWindow.style.top = `${newY}px`;
        }
        if (isResizing && currentResizeWindow) {
            const dx = e.clientX - resizeStartX;
            const dy = e.clientY - resizeStartY;
            currentResizeWindow.style.width = `${Math.max(250, resizeStartWidth + dx)}px`;
            currentResizeWindow.style.height = `${Math.max(150, resizeStartHeight + dy)}px`;
        }
    }

    function handleMouseUp() {
        isDragging = false;
        isResizing = false;
        currentDragWindow = null;
        currentResizeWindow = null;
    }

    function addAppToTaskbar(windowId, title) {
        const appIcon = document.createElement('div');
        appIcon.classList.add('running-app-icon');
        appIcon.dataset.windowId = windowId;
        appIcon.innerHTML = `<img src="https://placehold.co/30x30/FF0000/000000?text=APP" alt="${title}">`;
        runningAppsContainer.appendChild(appIcon);

        appIcon.addEventListener('click', () => {
            const windowEl = document.getElementById(windowId);
            if (windowEl) {
                if (windowEl.style.display === 'none') {
                    windowEl.style.display = 'flex';
                }
                bringWindowToFront(windowEl);
            }
        });

        appIcon.classList.add('active');
    }

    function removeAppFromTaskbar(windowId) {
        const appIcon = runningAppsContainer.querySelector(`[data-window-id="${windowId}"]`);
        if (appIcon) appIcon.remove();
    }

    // --- Menu Iniciar ---
    function toggleStartMenu() {
        if (!startMenu) {
            startMenu = startMenuTemplate.cloneNode(true);
            startMenu.style.display = 'block';
            taskbar.appendChild(startMenu);

            startMenu.querySelectorAll('.start-menu-item').forEach(item => {
                item.addEventListener('click', () => {
                    if (item.id === 'logout') {
                        showMessage('Sistema encerrado.');
                        setTimeout(() => hideMessage(), 2000);
                    } else if (item.textContent === 'Bloco de Notas') {
                        openNotepad();
                    } else if (item.textContent === 'Meus Documentos') {
                        openFolder();
                    }
                    startMenu.style.display = 'none';
                });
            });
        } else {
            startMenu.style.display = startMenu.style.display === 'none' ? 'block' : 'none';
        }
    }

// --- Application Specific Functions ---

function openNotepad() {
    console.log('Função openNotepad chamada');
    if (appData.notepad.windowId && document.getElementById(appData.notepad.windowId)) {
        console.log('Janela do Bloco de Notas já existe, trazendo para frente');
        const existingWindow = document.getElementById(appData.notepad.windowId);
        if (existingWindow.style.display === 'none') {
            console.log('Mostrando janela do Bloco de Notas que estava oculta');
            existingWindow.style.display = 'flex';
        }
        bringWindowToFront(existingWindow);
        return;
    }

    const notepadWindowId = `notepad-window-${Date.now()}`;
    const contentHtml = `<textarea class="notepad-textarea">${appData.notepad.content}</textarea>`;
    const newNotepadWindow = createWindow(notepadWindowId, 'Bloco de Notas', 'notepad', contentHtml);
    appData.notepad.windowId = notepadWindowId;

    const textarea = newNotepadWindow.querySelector('.notepad-textarea');
    textarea.addEventListener('input', (e) => {
        appData.notepad.content = e.target.value;
        localStorage.setItem('notepadContent', appData.notepad.content);
    });
}

function openFolder() {
    console.log('Função openFolder chamada');
    if (appData.folder.windowId && document.getElementById(appData.folder.windowId)) {
        console.log('Janela de Pasta já existe, trazendo para frente');
        const existingWindow = document.getElementById(appData.folder.windowId);
        if (existingWindow.style.display === 'none') {
            console.log('Mostrando janela de Pasta que estava oculta');
            existingWindow.style.display = 'flex';
        }
        bringWindowToFront(existingWindow);
        return;
    }

    const folderWindowId = `folder-window-${Date.now()}`;
    let folderContentHtml = '<div class="folder-content">';
    appData.folder.items.forEach(item => {
        folderContentHtml += `
            <div class="folder-item">
                <img src="${item.icon}" alt="${item.name}">
                <span>${item.name}</span>
            </div>
        `;
    });
    folderContentHtml += '</div>';

    const newFolderWindow = createWindow(folderWindowId, 'Meus Documentos', 'folder', folderContentHtml);
    appData.folder.windowId = folderWindowId;
}

// --- Initialize the OS ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('Sistema operacional inicializando...');
    
    // Get DOM elements
    desktop = document.getElementById('desktop');
    taskbar = document.getElementById('taskbar');
    windowTemplate = document.getElementById('window-template');
    startMenuTemplate = document.getElementById('start-menu-template');
    notepadIcon = document.getElementById('notepad-icon');
    folderIcon = document.getElementById('folder-icon');
    runningAppsContainer = document.getElementById('running-apps-container');
    currentTimeSpan = document.getElementById('current-time');
    startButton = document.getElementById('start-button');
    messageBox = document.getElementById('message-box');
    messageText = document.getElementById('message-text');
    closeMessageBoxBtn = document.getElementById('close-message-btn');

    // Set up event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    closeMessageBoxBtn.addEventListener('click', hideMessage);
    messageBox.addEventListener('click', (e) => {
        if (e.target === messageBox) hideMessage();
    });

    // Set up desktop icons
    notepadIcon.addEventListener('dblclick', openNotepad);
    folderIcon.addEventListener('dblclick', openFolder);
    
    // Set up start button
    startButton.addEventListener('click', toggleStartMenu);

    // Initialize clock
    setInterval(updateCurrentTime, 1000);
    updateCurrentTime();
    
    console.log('Sistema operacional inicializado com sucesso!');
});

// Make functions globally available for debugging
window.openNotepad = openNotepad;
window.openFolder = openFolder;