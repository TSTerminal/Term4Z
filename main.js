
const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const proxyServer = require('./deps/TSTerm/simpleproxy/serve');

const homeMenuTemplate = [
    {
        label: 'File',
        submenu: [
            { label: "New",
              click: (menuItem, browserWindow) => {
                  console.log("clicked on new");
                  editSession(browserWindow, undefined);
              }
            },
            { role: 'quit' },
        ],
    },
    {
        label: 'Edit',
        submenu: [
            {
                label: 'Copy',
                click: () => {
                    console.log('Should Copy');
                },
            },
        ],
    },
    {
        label: 'View',
        submenu: [
            { role: 'toggledevtools' },
            { role: 'togglefullscreen' }
        ]
    }

];


const terminalMenuTemplate = [
    {
        label: 'File',
        submenu: [
            { role: 'quit' },
        ],
    },
    {
        label: 'Edit',
        submenu: [
            {
                label: 'Copy',
                click: () => {
                    console.log('Should Copy');
                },
            },
        ],
    },
    {
        label: 'View',
        submenu: [
            { role: 'toggledevtools' },
            { role: 'togglefullscreen' }
        ]
    }

];

let homeWindow = null;
let proxyOn = false;

const createWindow = () => {

    const preloadPath = path.join(__dirname, 'preload.js');
    console.log("preloadpath "+preloadPath);

    homeWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        webPreferences: {
            preload: preloadPath
        }
    });

    homeWindow.setMenu(Menu.buildFromTemplate(homeMenuTemplate));
    homeWindow.loadFile('index.html')
    homeWindow.webContents.on('did-finish-load', () => {
        sendSessions();
    });
}

const showDirectory = function(directoryPath){
    fs.readdir(directoryPath, (error, files) => {
        if (error) {
            console.log('Error reading directory:', error);
        } else {
            console.log(`Contents of directory '${directoryPath}':`);
            files.forEach((file, index) => {
                const fullPath = path.join(directoryPath, file);
                fs.stat(fullPath, (error, stats) => {
                    if (error) {
                        console.log('Error retrieving file info:', error);
                    } else {
                        const itemType = stats.isDirectory() ? 'Directory' : 'File';
                        console.log(`${index + 1}. ${itemType}: ${file}`);
                    }
                });
            });
        }
    });
}

const ensureSettingsDirectories = function(callback){
    const homeDir = os.homedir();
    const settingsDir = path.join(homeDir, '.term4z');

    if (!fs.existsSync(settingsDir)) {
        fs.mkdirSync(settingsDir);
    }
    showDirectory(settingsDir);
    const sessionsDir = path.join(homeDir, '.term4z', 'sessions');
    if (!fs.existsSync(sessionsDir)) {
        fs.mkdirSync(sessionsDir);
    }
    callback();
}

const getSessionsDir = function(){
    return path.join(os.homedir(), '.term4z', 'sessions');
}

const showSettings = function(){
    ensureSettingsDirectories(()=> {
        const sessionsDir = getSessionsDir();
        showDirectory(sessionsDir);
    });
}

const saveSession = function(sessionData){
    ensureSettingsDirectories(()=> {
        const sessionsDir = getSessionsDir();
        const filename = sessionData.name.replace(' ','_');
        fs.writeFileSync(path.join(sessionsDir, filename),
                         JSON.stringify(sessionData, null, 2));
        sendSessions();
    });
}

// callback gets err|undefined sessionData|undefined
const readSession = function(sessionName, callback){
    ensureSettingsDirectories(()=> {
        const sessionsDir = getSessionsDir();
        const filename = sessionName.replace(' ','_');
        fs.readFile(path.join(sessionsDir, filename), "utf8",
                    (err, data) => {
                        if (err){
                            callback(err, data);
                        } else {
                            let sessionData = JSON.parse(data);
                            callback(err, sessionData);
                        }
                    });
    });
}

const readJSONFilesSync = function(subdir, filter){
    const jsonDir = path.join(os.homedir(), '.term4z', subdir);
    const result = [];
    
    try {
        const files = fs.readdirSync(jsonDir);
        console.log("read the json files "+JSON.stringify(files));
        for (const file of files) {
            const filePath = path.join(jsonDir, file);
            
            try {
                const fileContent = fs.readFileSync(filePath, 'utf-8');
                const jsonContent = JSON.parse(fileContent);
                console.log("about to filter "+JSON.stringify(jsonContent));
                if (filter(jsonContent)){
                    result.push(jsonContent);
                }
            } catch (err) {
                // Ignore files that don't contain valid JSON or don't have the required properties
            }
        }
    } catch (err) {
        console.error('Error reading session files:', err);
    }
    
    return result;
}

const sendSessions = function(){
    const sessions = readJSONFilesSync('sessions', (json) => {
        return json.name && json.hostname && json.port;
    });
    
    homeWindow.webContents.send('sessions-data', { sessions });
}

app.whenReady().then(() => {
    createWindow();
    console.log("created a window from main.js");

    // handle the MacOS/Darwin open when no windows open
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });

    showSettings();

});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
});

ipcMain.on('run-proxy', (event, sessionData) => {
    console.log("before starting the proxyServer ..., sessionData="+JSON.stringify(sessionData));
    if (!proxyOn){
        proxyServer.run(8000);
        proxyOn = true;
        console.log("proxyServer started, or at least starting");
    }
    const terminalWindow = new BrowserWindow({
        width: 800,
        height: 600});
    const terminalMenu = Menu.buildFromTemplate(terminalMenuTemplate);
    terminalWindow.setMenu(terminalMenu);
    terminalWindow.loadURL("http://localhost:8000/static/app/minimal.html?address="+
                           sessionData.hostname+
                           "&port="+
                           sessionData.port);
});

ipcMain.on('save-session-configuration', (event, arg) => {
    console.log("save-session-configuration, event="+event+" data="+JSON.stringify(arg));
    saveSession( arg );
});

const runConfigEditor = function(parentWindow, sessionData){
    const preloadPath = path.join(__dirname, 'preload.js');
    const child = new BrowserWindow({
        parent: parentWindow,
        width: 600,
        height: 600,
        webPreferences: {
            devTools: true,
            nodeIntegration: true,
            preload: preloadPath
        },
        modal: true,
        show: false });
    // It is better to use URL's than files
    
    let params = "sessionName="+(sessionData ? sessionData.name : "<new>");
    child.loadURL(`file://${__dirname}/modal.html?${params}`); // config=configIdentifierOrFilename`);
    child.removeMenu();
    child.webContents.openDevTools();
    child.once('ready-to-show', () => {
        // console.log("calling editSession() 4");
        child.show();

    });
    if (sessionData){
        child.webContents.on('did-finish-load', () => {
            // console.log("sending the session data");
            child.webContents.send('session-data', { session: sessionData });
        });
    }
}


const editSession = function(parentWindow, existingSessionNameOrUndefined){
    console.log("calling editSession()");
    let configData = null;
    if (existingSessionNameOrUndefined){
        readSession(existingSessionNameOrUndefined,
                    (err, sessionData) => {
                        if (err){
                            console.log("could not read sessionData for "+existingSessionNameOrUndefined);
                        } else {
                            // console.log("should edit this "+JSON.stringify(sessionData, null, 2));
                            runConfigEditor(parentWindow, sessionData);
                        } 
                    });
    }
}

// how to get the parent window and sessionName
ipcMain.on('edit-session', (event, sessionData) => {
    editSession( homeWindow, sessionData.name);
    // editSession();
    // here, work on editing
    // what are the other session detailst to edit
    // where to save, what's similar to/greater than what's in Zowe now
    // improve session manager an call it such
    // json-schema for config
    //   ajv
    // online help window
});
