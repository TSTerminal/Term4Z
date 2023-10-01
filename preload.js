const { contextBridge, ipcRenderer } = require('electron')

// const ipcRenderer = window.require('electron').ipcRenderer;

// console.log("mr preload running...");

contextBridge.exposeInMainWorld(
    'electron',
    {
        sendServerEvent: ipcRenderer.send,
        receiveSessionsFromMain: (callback) => {
            ipcRenderer.on('sessions-data', (event, data) => {
                callback(data);
            });
        },
        receiveSessionFromMain: (callback) => {
            ipcRenderer.on('session-data', (event, data) => {
                console.log("we have single session received "+data);
                callback(data);
            });
        }
    });

