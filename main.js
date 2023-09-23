const path = require('path');
const os = require('os');
const fs = require('fs');
const resizeImg = require('resize-img')
const {app, BrowserWindow, Menu, ipcMain, shell} = require('electron')

const isDev = process.env.NODE_ENV !== 'production';
const isLinux = process.platform === 'linux';
let mainWindow;

// Creating mainWindow
function createMainWindow(){
    mainWindow = new BrowserWindow({
        title: 'image Resizer',
        width: isDev ? 1000 : 500,
        height: 600,
        webPreferences:{
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: true
        }
    })

    // Open devtools if in dev
    if(isDev){
        mainWindow.webContents.openDevTools();
    }

    mainWindow.loadFile(path.join(__dirname, './renderer/index.html'))
}

// Create About Window
function createAboutWindow() {
    const aboutWindow = new BrowserWindow({
        title: 'About image Resizer',
        width: 300,
        height: 300
    })

    aboutWindow.loadFile(path.join(__dirname, './renderer/about.html'))
}


// App is Ready
app.whenReady().then(function(){
    createMainWindow()

    // Implement the menu
    const mainMenu = Menu.buildFromTemplate(menuTemplate)
    Menu.setApplicationMenu(mainMenu)

    // Remove mainWindow from memory on close
    mainWindow.on('closed', ()=> mainWindow === null)

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
      })
})

// Menu Template
const menuTemplate = [
    ...(isLinux ? [{
        label: app.name,
        submenu: [{
            label: 'About',
            click:createAboutWindow
        }]
    }] : []),
    {
        role: 'fileMenu'
        // label: 'File',
        // submenu :[
        //     {
        //         label: 'Quit',
        //         click: () => app.quit(),
        //         accelerator: 'CmdOrCtrl+W'
        //     }
        // ]
    },
    ...(isLinux ? [{
        label: 'Help',
        submenu: [{
            label: 'About',
            click:createAboutWindow
        }]
    }] : []),
    ...(isDev
        ? [
            {
              label: 'Developer',
              submenu: [
                { role: 'reload' },
                { role: 'forcereload' },
                { type: 'separator' },
                { role: 'toggledevtools' },
              ],
            },
          ]
        : []),
];

// response to ipc
ipcMain.on('image:resize', (e, options)=>{
    options.dest = path.join(os.homedir(), 'imageresizer')
    resizeImage(options)
})

// Resize the image
async function resizeImage({imgPath, width, height, dest}) {
    try {
        const newPath = await resizeImg(fs.readFileSync(imgPath), {width: +width, height: +height})
        const filename = path.basename(imgPath) // create filename
        // create destination folder 
        if(!fs.existsSync(dest)){
            fs.mkdirSync(dest)
        }
        // write fle to destination folder
        fs.writeFileSync(path.join(dest, filename), newPath)
        // Send success message to ipc renderer
        mainWindow.webContents.send('image:done')
        // open destination folder
        shell.openPath(dest)
    } catch (error) {
        console.log(error)
    }
}


app.on('window-all-closed', function(){
    if(!isLinux){
        app.quit()
    }
})