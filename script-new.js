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
    if (!messageText || !messageBox) return;
    messageText.textContent = message;
    messageBox.style.display = 'flex';
}

function hideMessage() {
    if (messageBox) messageBox.style.display = 'none';
}

function updateCurrentTime() {
    if (!currentTimeSpan) return;
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    currentTimeSpan.textContent = `${hours}:${minutes}`;
}

function createWindow(id, title, type, contentHtml) {
    if (!desktop || !windowTemplate) return null;
    
    console.log(`Criando janela: ${title} (${id})`);
    const newWindow = windowTemplate.content.cloneNode(true).firstElementChild;
    newWindow.id = id;
    newWindow.style.display = 'flex';
    newWindow.style.left = `${50 + Math.random() * 50}px`;
    newWindow.style.top = `${50 + Math.random() * 50}px`;
    newWindow.style.zIndex = ++zIndexCounter;
    newWindow.dataset.type = type;

    const titleElement = newWindow.querySelector('.window-title');
    if (titleElement) titleElement.textContent = title;
    
    const windowContent = newWindow.querySelector('.window-content');
    if (windowContent) windowContent.innerHTML = contentHtml;

    desktop.appendChild(newWindow);
    openWindows.push(newWindow);

    const closeBtn = newWindow.querySelector('.close-btn');
    const minimizeBtn = newWindow.querySelector('.minimize-btn');
    const maximizeBtn = newWindow.querySelector('.maximize-btn');
    const titleBar = newWindow.querySelector('.window-title-bar');
    const resizeHandle = newWindow.querySelector('.resize-handle');

    if (closeBtn) closeBtn.addEventListener('click', () => closeWindow(newWindow));
    if (minimizeBtn) minimizeBtn.addEventListener('click', () => minimizeWindow(newWindow));
    if (maximizeBtn) maximizeBtn.addEventListener('click', () => maximizeWindow(newWindow));
    
    newWindow.addEventListener('mousedown', (e) => {
        if (e.target === newWindow || e.target === windowContent) {
            bringWindowToFront(newWindow);
        }
    });

    if (titleBar) {
        titleBar.addEventListener('mousedown', startDragging);
    }
    
    if (resizeHandle) {
        resizeHandle.addEventListener('mousedown', startResizing);
    }

    addAppToTaskbar(id, title);
    return newWindow;
}

function bringWindowToFront(windowEl) {
    if (!windowEl) return;
    windowEl.style.zIndex = ++zIndexCounter;
    if (!runningAppsContainer) return;
    
    const appIcon = runningAppsContainer.querySelector(`[data-window-id="${windowEl.id}"]`);
    if (appIcon) {
        runningAppsContainer.querySelectorAll('.running-app-icon').forEach(icon => {
            icon.classList.remove('active');
        });
        appIcon.classList.add('active');
    }
}

function closeWindow(windowEl) {
    if (!windowEl || !windowEl.parentNode) return;
    
    try {
        desktop.removeChild(windowEl);
        openWindows = openWindows.filter(w => w !== windowEl);
        removeAppFromTaskbar(windowEl.id);
        
        if (windowEl.dataset.type === 'notepad') {
            appData.notepad.windowId = null;
        } else if (windowEl.dataset.type === 'folder') {
            appData.folder.windowId = null;
        }
    } catch (e) {
        console.error('Erro ao fechar janela:', e);
    }
}

function minimizeWindow(windowEl) {
    if (!windowEl) return;
    
    windowEl.style.display = 'none';
    if (!runningAppsContainer) return;
    
    const appIcon = runningAppsContainer.querySelector(`[data-window-id="${windowEl.id}"]`);
    if (appIcon) {
        appIcon.classList.remove('active');
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
    if (e.button !== 0) return; // Only left mouse button
    
    isDragging = true;
    currentDragWindow = e.target.closest('.window');
    if (!currentDragWindow) return;
    
    const rect = currentDragWindow.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    
    bringWindowToFront(currentDragWindow);
    e.preventDefault();
}

function startResizing(e) {
    if (e.button !== 0) return; // Only left mouse button
    
    isResizing = true;
    currentResizeWindow = e.target.closest('.window');
    if (!currentResizeWindow) return;
    
    resizeStartX = e.clientX;
    resizeStartY = e.clientY;
    resizeStartWidth = currentResizeWindow.offsetWidth;
    resizeStartHeight = currentResizeWindow.offsetHeight;
    
    bringWindowToFront(currentResizeWindow);
    e.preventDefault();
}

function handleMouseMove(e) {
    if (isDragging && currentDragWindow) {
        const newX = e.clientX - dragOffsetX;
        const newY = e.clientY - dragOffsetY;
        
        // Keep window within bounds
        const maxX = window.innerWidth - currentDragWindow.offsetWidth;
        const maxY = window.innerHeight - 40; // 40px for taskbar
        
        currentDragWindow.style.left = `${Math.max(0, Math.min(newX, maxX))}px`;
        currentDragWindow.style.top = `${Math.max(0, Math.min(newY, maxY))}px`;
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

    appIcon.addEventListener('click', (e) => {
        e.stopPropagation();
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
    if (!runningAppsContainer) return;
    const appIcon = runningAppsContainer.querySelector(`[data-window-id="${windowId}"]`);
    if (appIcon) appIcon.remove();
}

// --- Menu Iniciar ---
function toggleStartMenu(e) {
    if (e) {
        e.stopPropagation();
    }
    
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
                } else if (item.textContent.includes('Bloco de Notas') || item.textContent === 'Bloco de Notas') {
                    openNotepad();
                } else if (item.textContent.includes('Meus Documentos') || item.textContent === 'Meus Documentos') {
                    openFolder();
                }
                startMenu.style.display = 'none';
            });
        });
        
        // Add submenu items
        const programsSubmenu = startMenu.querySelector('#programs-submenu');
        if (programsSubmenu) {
            programsSubmenu.querySelectorAll('.submenu-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (item.textContent.includes('Bloco de Notas')) {
                        openNotepad();
                    } else if (item.textContent.includes('Calculadora')) {
                        showMessage('Calculadora ainda não implementada.');
                    }
                    startMenu.style.display = 'none';
                });
            });
        }
        
        // Close menu when clicking outside
        setTimeout(() => {
            document.addEventListener('click', function closeMenu(e) {
                if (startMenu && !startMenu.contains(e.target) && e.target !== startButton) {
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
    if (!newNotepadWindow) return;
    
    appData.notepad.windowId = notepadWindowId;

    const textarea = newNotepadWindow.querySelector('.notepad-textarea');
    if (textarea) {
        textarea.addEventListener('input', (e) => {
            appData.notepad.content = e.target.value;
            localStorage.setItem('notepadContent', appData.notepad.content);
        });
        
        // Focus the textarea when the window is created
        setTimeout(() => {
            textarea.focus();
        }, 100);
    }
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
                <button class="view-option active" data-view="icons">Ícones</button>
                <button class="view-option" data-view="list">Lista</button>
                <button class="view-option" data-view="details">Detalhes</button>
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
    if (!newFolderWindow) return;
    
    appData.folder.windowId = folderWindowId;
    
    // Add event listeners for view options
    const viewOptions = newFolderWindow.querySelectorAll('.view-option');
    if (viewOptions) {
        viewOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const itemsContainer = newFolderWindow.querySelector('.folder-items');
                if (!itemsContainer) return;
                
                const view = e.target.dataset.view;
                newFolderWindow.querySelectorAll('.view-option').forEach(btn => {
                    btn.classList.remove('active');
                });
                e.target.classList.add('active');
                itemsContainer.className = 'folder-items';
                itemsContainer.classList.add(`view-${view}`);
            });
        });
    }
}

// --- Initialize the OS ---
function initializeOS() {
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
        if (closeMessageBoxBtn) {
            closeMessageBoxBtn.addEventListener('click', hideMessage);
        }
        
        if (messageBox) {
            messageBox.addEventListener('click', (e) => {
                if (e.target === messageBox) hideMessage();
            });
        }

        // Desktop icons - using both click and dblclick for better compatibility
        notepadIcon.addEventListener('dblclick', openNotepad);
        folderIcon.addEventListener('dblclick', openFolder);
        
        // Also add click handlers with debounce to prevent double-triggering
        let clickTimer;
        notepadIcon.addEventListener('click', (e) => {
            clearTimeout(clickTimer);
            clickTimer = setTimeout(() => {
                openNotepad();
            }, 200);
        });
        
        folderIcon.addEventListener('click', (e) => {
            clearTimeout(clickTimer);
            clickTimer = setTimeout(() => {
                openFolder();
            }, 200);
        });
        
        // Start button
        if (startButton) {
            startButton.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleStartMenu(e);
            });
        }

        // Close start menu when clicking on desktop
        if (desktop) {
            desktop.addEventListener('click', () => {
                if (startMenu && startMenu.style.display === 'block') {
                    startMenu.style.display = 'none';
                }
            });
        }

        // Initialize clock
        if (currentTimeSpan) {
            setInterval(updateCurrentTime, 1000);
            updateCurrentTime();
        }
        
        console.log('Sistema operacional inicializado com sucesso!');
    } catch (error) {
        console.error('Erro ao inicializar o sistema operacional:', error);
        alert('Ocorreu um erro ao inicializar o sistema. Por favor, recarregue a página.');
    }
}

// Start the OS when the DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeOS);
} else {
    initializeOS();
}

// Make functions globally available for debugging
window.openNotepad = openNotepad;
window.openFolder = openFolder;
