//const { ipcRenderer } = require('electron');
// import { ipcRenderer } from "electron";

const setHandlers = function(){
    const launchButton = document.getElementById('launchProxy');
    console.log("launchButton = "+launchButton+" electron="+electron);
    if (launchButton){
        launchButton.addEventListener('click', () => {
            electron.sendServerEvent('run-proxy');
        });
    }
    electron.receiveSessionsFromMain( (data) => {
        console.log("got session data in renderer.js "+JSON.stringify(data));
        updateContainer(data.sessions);
    });
    document.addEventListener('click', hideContextMenu);

};

const updateContainer = function(objects) {
  const container = document.getElementById('container');
  container.innerHTML = '';

    objects.forEach((obj) => {
        const iconContainer = document.createElement('div');
        iconContainer.classList.add('icon-container');
        iconContainer.addEventListener('contextmenu',
                                       (event) => { showContextMenu(event, obj); });
        
        const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        icon.setAttribute('width', '24');
        icon.setAttribute('height', '24');
        icon.setAttribute('viewBox', '0 0 24 24');
        icon.classList.add('icon');
        
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('width', '18');
        rect.setAttribute('height', '12');
        rect.setAttribute('x', '3');
        rect.setAttribute('y', '6');
        rect.setAttribute('fill', obj.color || '#cee');
        icon.appendChild(rect);
        
        iconContainer.appendChild(icon);
        
        const label = document.createElement('span');
        label.textContent = obj.name;
        iconContainer.appendChild(label);
        
        container.appendChild(iconContainer);
    });
}

const menuCallback = function(option) {
    console.log(`Selected: ${option.name}`);
    hideContextMenu();
    if (option.callback){
        option.callback();
    }
}

const fillContextMenu = function(menuOptions){
    const contextMenu = document.getElementById('context-menu');
    while (contextMenu.firstChild) {
        contextMenu.removeChild(contextMenu.firstChild);
    }
    menuOptions.forEach((option) => {
    const menuItem = document.createElement('div');
    menuItem.classList.add('context-menu-item');
    menuItem.textContent = option.name;
    menuItem.onclick = () => menuCallback(option);
    contextMenu.appendChild(menuItem);
  });
}

const showContextMenu = function(event, sessionData) {
    fillContextMenu([ { name: "Launch",
                        callback: ()=> {
                            electron.sendServerEvent('run-proxy',sessionData);
                        }
                      },
                      { name: "Configure...",
                        callback: ()=> {
                            electron.sendServerEvent('edit-session',sessionData);
                        }
                      },
                      { name: "Delete" }]);
    const contextMenu = document.getElementById('context-menu');
    contextMenu.style.left = `${event.pageX}px`;
    contextMenu.style.top = `${event.pageY}px`;
    contextMenu.style.display = 'block';
    event.preventDefault();
}

const hideContextMenu = function() {
    const contextMenu = document.getElementById('context-menu');
    contextMenu.style.display = 'none';
}

console.log("start renderer.js");

setHandlers();

console.log("end renderer.js");
