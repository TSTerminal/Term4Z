
document.getElementById('propertyForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const name = document.getElementById('name').value;
    const hostname = document.getElementById('hostname').value;
    const port = parseInt(document.getElementById('port').value, 10);
    const deviceType = document.getElementById('deviceType').value;
    electron.sendServerEvent('save-session-configuration',
                             { name, hostname, port, deviceType });
  window.close();
});

const updateControls = function(sessionData){
    document.getElementById('name').value = sessionData.name;
    document.getElementById('hostname').value = sessionData.hostname;
    document.getElementById('port').value = sessionData.port+"";
    document.getElementById('deviceType').value = sessionData.deviceType;
}

document.getElementById('cancel').addEventListener('click', () => {
  window.close();
});

const loadHandler = function(){
    const params = new URL(document.location).searchParams;
    electron.receiveSessionFromMain( (data) => {
        console.log("got single session data in renderer.js "+JSON.stringify(data));
        updateControls(data.session);
    });

    const sessionName = params.get("sessionName");
    console.log("modal editor should read sessionName '"+sessionName+"'");
}

loadHandler();
