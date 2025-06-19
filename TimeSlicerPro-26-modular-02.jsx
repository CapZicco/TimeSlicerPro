// ====================================================================
// === TimeSlicerPro v26.00 – Modular & Complete – CapZicco & Cuocografo – 2025 ===
// ====================================================================
//
// Basato su v24. Tutto in inglese per compatibilità internazionale.
//
// Features base: settings retrocompatibili, logging, ESC, variabili globali, directory batch
// ====================================================================

// === [ CREDITS / INFO ] ===
/*
    Script created by CapZicco, modular rewrite and features by Cuocografo (2025)
    Official repo: https://github.com/CapZicco/TimeSlicerPro
    Collaborators welcome!
*/

// === [ GLOBAL CONSTANTS & FLAGS ] ===
var SCRIPT_NAME = "TimeSlicerPro";
var SCRIPT_VERSION = "v26.00";

// === Logging mode (checkbox in GUI, default true) ===
var DEBUG_MODE = true;

// === ESC user interrupt (set by key event) ===
var TSP_USER_INTERRUPT = false;

// === Global: source/destination directories ===
var SOURCE_DIR = null;
var DEST_DIR = null;

// === Image counter (updates on source select) ===
var IMG_COUNT = 0;

// === SETTINGS PATH (Cartella settings) ===
var settingsFolderPath = '~/Documents/tsp/';
var lastSettingsFileName = "TSP-LastSettingsUsed.txt";


// === [ LOGGING ] ===
function log(msg) {
    if (DEBUG_MODE) $.writeln("[LOG] " + msg);
}

// === Salva settings attuali su "LastSettingsUsed.txt" ===
function saveLastSettings(settingsObj) {
    var folder = Folder(settingsFolderPath);
    if (!folder.exists) folder.create();
    var file = new File(folder.fsName + "/" + lastSettingsFileName);
    file.open("w");
    for (var k in settingsObj) if (settingsObj.hasOwnProperty(k)) {
        file.writeln(k + ": " + settingsObj[k]);
    }
    file.close();
}

// === Carica settings da "LastSettingsUsed.txt" ===
function loadLastSettings() {
    var file = new File(settingsFolderPath + "/" + lastSettingsFileName);
    if (!file.exists) return null;
    var obj = {};
    file.open("r");
    while (!file.eof) {
        var l = file.readln();
        var idx = l.indexOf(":");
        if (idx > 0) {
            var k = l.substring(0, idx).replace(/\s/g, "");
            var v = l.substring(idx + 1).replace(/^\s+/, "");
            obj[k] = v;
        }
    }
    file.close();
    return obj;
}


// === [ ESC HANDLER UNIVERSALE ] ===
function checkUserInterrupt() {
    if (TSP_USER_INTERRUPT) throw new Error("Process interrupted by user (ESC)");
}


// === [ SETTINGS RETROCOMPATIBILI: TXT FILE, VEDI V24 ] ===
var TSP_VERSION = SCRIPT_VERSION;
var settingsPath = '~/Documents/tsp/TSP-LastSettingsUsed.txt';

// Save settings as plain txt (key: value), v24 style, FULL COMPATIBILITY
function saveSettings(settings) {
    var folder = Folder('~/Documents/tsp/');
    if (!folder.exists) folder.create();
    var file = new File(settingsPath);
    file.open("w");
    for (var k in settings) {
        if (settings.hasOwnProperty(k)) {
            file.writeln(k + ": " + settings[k]);
        }
    }
    file.close();
}

// Load settings from plain txt, v24 style, returns object
function loadSettings() {
    var file = new File(settingsPath);
    if (!file.exists) return null;
    var obj = {};
    file.open("r");
    while (!file.eof) {
        var l = file.readln();
        var idx = l.indexOf(":");
        if (idx > 0) {
            var k = l.substring(0, idx).replace(/\s/g, "");
            var v = l.substring(idx + 1).replace(/^\s+/, "");
            obj[k] = v;
        }
    }
    file.close();
    var def = getDefaults();
    for (var k in def) {
        if (!obj.hasOwnProperty(k)) obj[k] = def[k];
        if (/^\d+$/.test(obj[k])) obj[k] = parseInt(obj[k], 10);
        if (obj[k] === "true") obj[k] = true;
        if (obj[k] === "false") obj[k] = false;
    }
    return obj;
}

// === [ DEFAULT SETTINGS OBJECT – TO BE EXTENDED IN BLOCCO 2 ] ===
function getDefaults() {
    return {
        pattern: 0,
        txtClassicHorizontalSlices: 10,
        txtClassicVerticalSlices: 10,
        txtClassicDiagonalSlices: 10,
        txtClassicTriangleSlices: 12,
        txtRadialSectors: 16,
        txtSpiralBands: 12,
        txtSpiralAngle: 90,
        txtOvalCount: 7,
        txtPuzzleRows: 5,
        txtPuzzleCols: 5,
        txtPuzzleStripCount: 8,
        txtSunbeamBeams: 16,
        txtWaveCount: 8,
        txtHexSize: 48,
        shadowEnable: true,
        shadowR: 0, shadowG: 0, shadowB: 0,
        shadowOpacity: 80,
        shadowDistance: 8,
        shadowBlur: 10,
        showPreview: true,
        keepPreview: false,
        enableLogging: true,
        sourceDir: "",
        destDir: ""
        // ...Estendi in BLOCCO 2 con nuovi parametri!
    };
}

// === SETTINGS PATH (Cartella dei settings txt) ===
var settingsFolderPath = '~/Documents/tsp/';

// Suggerisce il nome file settings (timestamp + pattern)
function getSettingsFilenameSuggested() {
    var d = new Date();
    function p(n) { return (n < 10 ? '0' : '') + n; }
    var timestamp = d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
    var pattern = ddPattern && ddPattern.selection ? ddPattern.selection.text.replace(/[^a-z0-9]/gi, "_").toLowerCase() : "pattern";
    return timestamp + "_" + pattern + ".txt";
}

// Raccoglie tutti i valori dei campi della GUI da salvare
function collectSettingsFromGui() {
    return {
        // Pattern e directory
        patternIndex: ddPattern && ddPattern.selection ? ddPattern.selection.index : 0,
        sourceDir: (typeof txtSourceDir !== "undefined" && txtSourceDir.text) ? txtSourceDir.text : "",
        destDir: (typeof txtDestDir !== "undefined" && txtDestDir.text) ? txtDestDir.text : "",

        // Parametri classici
        txtClassicHorizontalSlices: (typeof txtClassicHorizontalSlices !== "undefined" && txtClassicHorizontalSlices.text) ? txtClassicHorizontalSlices.text : "",
        txtClassicVerticalSlices: (typeof txtClassicVerticalSlices !== "undefined" && txtClassicVerticalSlices.text) ? txtClassicVerticalSlices.text : "",
        txtClassicDiagonalSlices: (typeof txtClassicDiagonalSlices !== "undefined" && txtClassicDiagonalSlices.text) ? txtClassicDiagonalSlices.text : "",
        txtClassicTriangleSlices: (typeof txtClassicTriangleSlices !== "undefined" && txtClassicTriangleSlices.text) ? txtClassicTriangleSlices.text : "",

        // Radial, Spiral, Oval
        txtRadialSectors: (typeof txtRadialSectors !== "undefined" && txtRadialSectors.text) ? txtRadialSectors.text : "",
        txtSpiralBands: (typeof txtSpiralBands !== "undefined" && txtSpiralBands.text) ? txtSpiralBands.text : "",
        txtSpiralAngle: (typeof txtSpiralAngle !== "undefined" && txtSpiralAngle.text) ? txtSpiralAngle.text : "",
        txtOvalCount: (typeof txtOvalCount !== "undefined" && txtOvalCount.text) ? txtOvalCount.text : "",

        // Puzzle 2D
        txtPuzzleRows: (typeof txtPuzzleRows !== "undefined" && txtPuzzleRows.text) ? txtPuzzleRows.text : "",
        txtPuzzleCols: (typeof txtPuzzleCols !== "undefined" && txtPuzzleCols.text) ? txtPuzzleCols.text : "",
        chkPuzzleOutline: (typeof chkPuzzleOutline !== "undefined" && chkPuzzleOutline.value) ? chkPuzzleOutline.value : false,

        // Puzzle 1D
        txtPuzzleStripCount: (typeof txtPuzzleStripCount !== "undefined" && txtPuzzleStripCount.text) ? txtPuzzleStripCount.text : "",
        ddPuzzleStripOrientation: (typeof ddPuzzleStripOrientation !== "undefined" && ddPuzzleStripOrientation.selection) ? ddPuzzleStripOrientation.selection.index : 0,
        chkPuzzle1DOutline: (typeof chkPuzzle1DOutline !== "undefined" && chkPuzzle1DOutline.value) ? chkPuzzle1DOutline.value : false,

        // Chessboard
        txtChessboardRows: (typeof txtChessboardRows !== "undefined" && txtChessboardRows.text) ? txtChessboardRows.text : "",
        txtChessboardCols: (typeof txtChessboardCols !== "undefined" && txtChessboardCols.text) ? txtChessboardCols.text : "",

        // Preview, Logging, Shadow
        chkShowPreview: (typeof chkShowPreview !== "undefined" && chkShowPreview.value) ? chkShowPreview.value : false,
        chkKeepPreview: (typeof chkKeepPreview !== "undefined" && chkKeepPreview.value) ? chkKeepPreview.value : false,
        chkLogging: (typeof chkLogging !== "undefined" && chkLogging.value) ? chkLogging.value : false,

        // Shadow settings (slider, color ecc.)
        chkShadow: (typeof chkShadow !== "undefined" && chkShadow.value) ? chkShadow.value : false,
        sliderShadowDistance: (typeof sliderShadowDistance !== "undefined") ? sliderShadowDistance.value : "",
        sliderShadowSize: (typeof sliderShadowSize !== "undefined") ? sliderShadowSize.value : "",
        sliderShadowOpacity: (typeof sliderShadowOpacity !== "undefined") ? sliderShadowOpacity.value : "",
        // Aggiungi qui eventuale campo colore (esempio: shadowColorRGB: ...)
    };
}


// Applica tutti i valori settings caricati sulla GUI
function applySettingsToGui(settings) {
    if (ddPattern && settings.patternIndex != null) ddPattern.selection = settings.patternIndex;
    if (txtClassicHorizontalSlices && settings.txtClassicHorizontalSlices) txtClassicHorizontalSlices.text = settings.txtClassicHorizontalSlices;
    if (txtClassicVerticalSlices && settings.txtClassicVerticalSlices) txtClassicVerticalSlices.text = settings.txtClassicVerticalSlices;
    // ...aggiungi qui tutti i campi che hai in GUI!
    // Shadow
    if (chkShadow && settings.chkShadow != null) chkShadow.value = (settings.chkShadow === "true" || settings.chkShadow === true);
    // Aggiungi TUTTI i parametri, uno per uno!
}


// Salva settings su file txt (cartella custom)
function saveSettings(settings) {
    var folder = Folder(settingsFolderPath);
    if (!folder.exists) folder.create();
    var file = new File(folder.fsName + "/" + getSettingsFilenameSuggested());
    file.open("w");
    for (var k in settings) if (settings.hasOwnProperty(k)) file.writeln(k + ": " + settings[k]);
    file.close();
}

// Carica settings da file txt
function loadSettings() {
    var file = new File(settingsFolderPath + "/" + getSettingsFilenameSuggested());
    if (!file.exists) return null;
    var obj = {};
    file.open("r");
    while (!file.eof) {
        var l = file.readln();
        var idx = l.indexOf(":");
        if (idx > 0) {
            var k = l.substring(0, idx).replace(/\s/g, "");
            var v = l.substring(idx + 1).replace(/^\s+/, "");
            obj[k] = v;
        }
    }
    file.close();
    return obj;
}

function loadSettingsWithPicker() {
    var folder = Folder(settingsFolderPath);
    if (!folder.exists) {
        alert("Nessun file di settings trovato.");
        return null;
    }
    var files = folder.getFiles("*.txt");
    if (!files || files.length === 0) {
        alert("Nessun file di settings presente.");
        return null;
    }
    var file = File.openDialog("Seleziona il file settings da caricare:", function(f) { return f instanceof File && /\.txt$/i.test(f.name); }, folder);
    if (!file) return null;

    var obj = {};
    file.open("r");
    while (!file.eof) {
        var l = file.readln();
        var idx = l.indexOf(":");
        if (idx > 0) {
            var k = l.substring(0, idx).replace(/\s/g, "");
            var v = l.substring(idx + 1).replace(/^\s+/, "");
            obj[k] = v;
        }
    }
    file.close();
    return obj;
}

// === SETTINGS AUTOLOAD/AUTOSAVE COMPATIBILE v24 ===
var settingsPath = '~/Documents/tsp/TimeSlicerPro-LastSettingsUsed.txt';

function saveSettingsObject(obj) {
    var folder = Folder('~/Documents/tsp/');
    if (!folder.exists) folder.create();
    var file = new File(settingsPath);
    file.open("w");
    for (var k in obj) {
        if (obj.hasOwnProperty(k)) file.writeln(k + ": " + obj[k]);
    }
    file.close();
}

function loadSettingsObject() {
    var file = new File(settingsPath);
    if (!file.exists) return null;
    var obj = {};
    file.open("r");
    while (!file.eof) {
        var l = file.readln();
        var idx = l.indexOf(":");
        if (idx > 0) {
            var k = l.substring(0, idx).replace(/\s/g, "");
            var v = l.substring(idx + 1).replace(/^\s+/, "");
            obj[k] = v;
        }
    }
    file.close();
    return obj;
}


// ====================================================================
// === BLOCCO 2 – GUI principale, parametri pattern, directory, shadow, preview, logging ===
// ====================================================================

// === [ MAIN DIALOG WINDOW ] ===
var myWin = new Window("dialog", SCRIPT_NAME + " " + SCRIPT_VERSION);

// === [ AUTOLOAD ALL'AVVIO ] ===
var settings = loadSettingsObject();
if (settings) applySettingsToGui(settings);


// === CARICA SETTINGS ALL’AVVIO ===
var lastSettings = loadSettings();
if (lastSettings) applySettingsToGui(lastSettings);
myWin.orientation = "column";
myWin.alignChildren = "fill";


// --- [ INFO GROUP: TITLE + ABOUT ] ---
var gTitle = myWin.add("group");
gTitle.orientation = "row";
var lblTitle = gTitle.add("statictext", undefined, SCRIPT_NAME + " " + SCRIPT_VERSION + "   ©CapZicco 2025");
lblTitle.justify = "left";
lblTitle.characters = 35;
var btnAbout = gTitle.add("button", undefined, "About");

// --- [ DIRECTORY GROUP: SOURCE/DEST ] ---
var gDirs = myWin.add("group");
gDirs.orientation = "row";
gDirs.alignChildren = "left";
gDirs.add("statictext", undefined, "Source:");
var txtSourceDir = gDirs.add("edittext", undefined, "", {readonly:true});
txtSourceDir.characters = 22;
var btnSelectSourceDir = gDirs.add("button", undefined, "...");
gDirs.add("statictext", undefined, "Dest:");
var txtDestDir = gDirs.add("edittext", undefined, "", {readonly:true});
txtDestDir.characters = 22;
var btnSelectDestDir = gDirs.add("button", undefined, "...");

// --- [ FILE COUNT GROUP ] ---
var gCount = myWin.add("group");
gCount.orientation = "row";
gCount.alignChildren = "left";
gCount.add("statictext", undefined, "Images:");
var lblImgCount = gCount.add("statictext", undefined, "0");
lblImgCount.characters = 5;

// --- [ PATTERN GROUP: Dropdown + param blocks (tutti in ordine alfabetico) ] ---
var gPattern = myWin.add("group");
gPattern.orientation = "row";
gPattern.add("statictext", undefined, "Pattern:");
var ddPattern = gPattern.add("dropdownlist", undefined, [
    "Chessboard",
    "Classic Diagonal",
    "Classic Horizontal",
    "Classic Triangle",
    "Classic Vertical",
    "HexGrid",
    "Oval",
    "Puzzle (2D)",
    "Puzzle Strip (1D)",
    "Radial",
    "Spiral",
    "Sunbeam",
    "Wave"
]);
ddPattern.selection = 2; // Classic Horizontal default

// === [ PARAMETER PANELS, uno per pattern, solo uno visibile per volta ] ===
var gParams = myWin.add("group");
gParams.orientation = "stack";

// --- Classic Horizontal ---
var gClassicHorizontal = gParams.add("group"); gClassicHorizontal.orientation = "row";
gClassicHorizontal.add("statictext", undefined, "Slices:");
var txtClassicHorizontalSlices = gClassicHorizontal.add("edittext", undefined, "10"); txtClassicHorizontalSlices.characters = 4;
// --- Classic Vertical ---
var gClassicVertical = gParams.add("group"); gClassicVertical.orientation = "row"; gClassicVertical.visible = false;
gClassicVertical.add("statictext", undefined, "Slices:");
var txtClassicVerticalSlices = gClassicVertical.add("edittext", undefined, "10"); txtClassicVerticalSlices.characters = 4;
// --- Classic Diagonal ---
var gClassicDiagonal = gParams.add("group"); gClassicDiagonal.orientation = "row"; gClassicDiagonal.visible = false;
gClassicDiagonal.add("statictext", undefined, "Slices:");
var txtClassicDiagonalSlices = gClassicDiagonal.add("edittext", undefined, "10"); txtClassicDiagonalSlices.characters = 4;
// --- Classic Triangle ---
var gClassicTriangle = gParams.add("group"); gClassicTriangle.orientation = "row"; gClassicTriangle.visible = false;
gClassicTriangle.add("statictext", undefined, "Slices:");
var txtClassicTriangleSlices = gClassicTriangle.add("edittext", undefined, "12"); txtClassicTriangleSlices.characters = 4;
// --- Chessboard ---
var gChessboard = gParams.add("group"); gChessboard.orientation = "row"; gChessboard.visible = false;
gChessboard.add("statictext", undefined, "Rows:");
var txtChessboardRows = gChessboard.add("edittext", undefined, "8"); txtChessboardRows.characters = 3;
gChessboard.add("statictext", undefined, "Cols:");
var txtChessboardCols = gChessboard.add("edittext", undefined, "8"); txtChessboardCols.characters = 3;
// --- HexGrid ---
var gHexGrid = gParams.add("group"); gHexGrid.orientation = "row"; gHexGrid.visible = false;
gHexGrid.add("statictext", undefined, "Hex size:");
var txtHexSize = gHexGrid.add("edittext", undefined, "48"); txtHexSize.characters = 5;
// --- Oval ---
var gOval = gParams.add("group"); gOval.orientation = "row"; gOval.visible = false;
gOval.add("statictext", undefined, "Ovals:");
var txtOvalCount = gOval.add("edittext", undefined, "7"); txtOvalCount.characters = 4;
// --- Puzzle 2D ---
var gPuzzle2d = gParams.add("group"); gPuzzle2d.orientation = "row"; gPuzzle2d.visible = false;
gPuzzle2d.add("statictext", undefined, "Rows:");
var txtPuzzleRows = gPuzzle2d.add("edittext", undefined, "5"); txtPuzzleRows.characters = 3;
gPuzzle2d.add("statictext", undefined, "Cols:");
var txtPuzzleCols = gPuzzle2d.add("edittext", undefined, "5"); txtPuzzleCols.characters = 3;
var chkPuzzleOutline = gPuzzle2d.add("checkbox", undefined, "Outline"); chkPuzzleOutline.value = true;
// --- Puzzle Strip 1D ---
var gPuzzle1d = gParams.add("group"); gPuzzle1d.orientation = "row"; gPuzzle1d.visible = false;
gPuzzle1d.add("statictext", undefined, "Strips:");
var txtPuzzleStripCount = gPuzzle1d.add("edittext", undefined, "8"); txtPuzzleStripCount.characters = 3;
gPuzzle1d.add("statictext", undefined, "Orientation:");
var ddPuzzleStripOrientation = gPuzzle1d.add("dropdownlist", undefined, ["Horizontal", "Vertical"]); ddPuzzleStripOrientation.selection = 0;
var chkPuzzle1DOutline = gPuzzle1d.add("checkbox", undefined, "Outline"); chkPuzzle1DOutline.value = true;
// --- Radial ---
var gRadial = gParams.add("group"); gRadial.orientation = "row"; gRadial.visible = false;
gRadial.add("statictext", undefined, "Sectors:");
var txtRadialSectors = gRadial.add("edittext", undefined, "16"); txtRadialSectors.characters = 4;
// --- Spiral ---
var gSpiral = gParams.add("group"); gSpiral.orientation = "row"; gSpiral.visible = false;
gSpiral.add("statictext", undefined, "Bands:");
var txtSpiralBands = gSpiral.add("edittext", undefined, "12"); txtSpiralBands.characters = 4;
gSpiral.add("statictext", undefined, "Angle:");
var txtSpiralAngle = gSpiral.add("edittext", undefined, "90"); txtSpiralAngle.characters = 4;
// --- Sunbeam ---
var gSunbeam = gParams.add("group"); gSunbeam.orientation = "row"; gSunbeam.visible = false;
gSunbeam.add("statictext", undefined, "Beams:");
var txtSunbeamBeams = gSunbeam.add("edittext", undefined, "16"); txtSunbeamBeams.characters = 4;
// --- Wave ---
var gWave = gParams.add("group"); gWave.orientation = "row"; gWave.visible = false;
gWave.add("statictext", undefined, "Waves:");
var txtWaveCount = gWave.add("edittext", undefined, "8"); txtWaveCount.characters = 4;

// === [ SHADOW PANEL ] ===
var gShadow = myWin.add("panel", undefined, "Shadow");
gShadow.orientation = "row";
var chkShadowEnable = gShadow.add("checkbox", undefined, "Enable"); chkShadowEnable.value = true;
gShadow.add("statictext", undefined, "R:"); var txtShadowR = gShadow.add("edittext", undefined, "0"); txtShadowR.characters = 3;
gShadow.add("statictext", undefined, "G:"); var txtShadowG = gShadow.add("edittext", undefined, "0"); txtShadowG.characters = 3;
gShadow.add("statictext", undefined, "B:"); var txtShadowB = gShadow.add("edittext", undefined, "0"); txtShadowB.characters = 3;
gShadow.add("statictext", undefined, "Opacity:"); var txtShadowOpacity = gShadow.add("edittext", undefined, "80"); txtShadowOpacity.characters = 3;
gShadow.add("statictext", undefined, "Distance:"); var txtShadowDistance = gShadow.add("edittext", undefined, "8"); txtShadowDistance.characters = 3;
gShadow.add("statictext", undefined, "Blur:"); var txtShadowBlur = gShadow.add("edittext", undefined, "10"); txtShadowBlur.characters = 3;

// === [ PREVIEW, LOGGING, SETTINGS CONTROLS ] ===
var gOptions = myWin.add("group");
gOptions.orientation = "row";
var chkShowPreview = gOptions.add("checkbox", undefined, "Show Preview"); chkShowPreview.value = true;
var chkKeepPreview = gOptions.add("checkbox", undefined, "Keep Preview"); chkKeepPreview.value = false;
var chkLogging = gOptions.add("checkbox", undefined, "Enable Logging"); chkLogging.value = DEBUG_MODE;
gOptions.add("statictext", undefined, " ");
var btnLoadSettings = gOptions.add("button", undefined, "Load");
var btnSaveSettings = gOptions.add("button", undefined, "Save");
var btnResetSettings = gOptions.add("button", undefined, "Reset");
// funzione onClick:
btnLoadSettings.onClick = function() {
    var loaded = loadSettingsWithPicker();
    if (loaded) applySettingsToGui(loaded);
};

// === [ ACTION BUTTONS: RUN, CANCEL, HELP ] ===
var gActions = myWin.add("group");
gActions.orientation = "row";
var btnRun = gActions.add("button", undefined, "Time Slice");
var btnCancel = gActions.add("button", undefined, "Quit");
var btnHelp = gActions.add("button", undefined, "?");

// === [ PARAMETER PANEL VISIBILITY: solo gruppo pattern selezionato ] ===
function updateParamGroups() {
    var visList = [
        gChessboard, gClassicDiagonal, gClassicHorizontal, gClassicTriangle, gClassicVertical,
        gHexGrid, gOval, gPuzzle2d, gPuzzle1d, gRadial, gSpiral, gSunbeam, gWave
    ];
    for (var i = 0; i < visList.length; i++) visList[i].visible = false;
    switch (ddPattern.selection.text) {
        case "Classic Horizontal": gClassicHorizontal.visible = true; break;
        case "Classic Vertical":   gClassicVertical.visible = true; break;
        case "Classic Diagonal":   gClassicDiagonal.visible = true; break;
        case "Classic Triangle":   gClassicTriangle.visible = true; break;
        case "Chessboard":         gChessboard.visible = true; break;
        case "HexGrid":            gHexGrid.visible = true; break;
        case "Oval":               gOval.visible = true; break;
        case "Puzzle (2D)":        gPuzzle2d.visible = true; break;
        case "Puzzle Strip (1D)":  gPuzzle1d.visible = true; break;
        case "Radial":             gRadial.visible = true; break;
        case "Spiral":             gSpiral.visible = true; break;
        case "Sunbeam":            gSunbeam.visible = true; break;
        case "Wave":               gWave.visible = true; break;
    }
}
ddPattern.onChange = updateParamGroups;

updateParamGroups(); // Avvia con pattern default visibile

// === END BLOCCO 2 ===
// ====================================================================
// === BLOCCO 3 – Handlers: directory, count, settings, logging, about ===
// ====================================================================

// --- [ DIRECTORY SELECTION + FILE COUNT ] ---
btnSelectSourceDir.onClick = function() {
    var d = Folder.selectDialog("Select source image folder");
    if (!d) return;
    SOURCE_DIR = d;
    txtSourceDir.text = SOURCE_DIR.fsName;
    // Conta solo immagini
    var files = SOURCE_DIR.getFiles(function(f) { return f instanceof File && f.name.match(/\.(jpe?g|png|tif?f|bmp)$/i); });
    IMG_COUNT = files.length;
    lblImgCount.text = IMG_COUNT + "";
    log("Source directory set: " + SOURCE_DIR.fsName + " (" + IMG_COUNT + " images)");
};
btnSelectDestDir.onClick = function() {
    var d = Folder.selectDialog("Select destination folder");
    if (!d) return;
    DEST_DIR = d;
    txtDestDir.text = DEST_DIR.fsName;
    log("Destination directory set: " + DEST_DIR.fsName);
};

// --- [ LOGGING SWITCH ] ---
chkLogging.onClick = function() {
    DEBUG_MODE = chkLogging.value;
    log("Logging is now: " + (DEBUG_MODE ? "ENABLED" : "DISABLED"));
};

// --- [ LOAD/SAVE/RESET SETTINGS TXT: V24 STYLE ] ---
btnSaveSettings.onClick = function() {
    var settings = {
        pattern: ddPattern.selection.index,
        txtClassicHorizontalSlices: txtClassicHorizontalSlices.text,
        txtClassicVerticalSlices: txtClassicVerticalSlices.text,
        txtClassicDiagonalSlices: txtClassicDiagonalSlices.text,
        txtClassicTriangleSlices: txtClassicTriangleSlices.text,
        txtChessboardRows: txtChessboardRows.text,
        txtChessboardCols: txtChessboardCols.text,
        txtHexSize: txtHexSize.text,
        txtOvalCount: txtOvalCount.text,
        txtPuzzleRows: txtPuzzleRows.text,
        txtPuzzleCols: txtPuzzleCols.text,
        txtPuzzleStripCount: txtPuzzleStripCount.text,
        txtSunbeamBeams: txtSunbeamBeams.text,
        txtWaveCount: txtWaveCount.text,
        txtRadialSectors: txtRadialSectors.text,
        txtSpiralBands: txtSpiralBands.text,
        txtSpiralAngle: txtSpiralAngle.text,
        shadowEnable: chkShadowEnable.value,
        shadowR: txtShadowR.text, shadowG: txtShadowG.text, shadowB: txtShadowB.text,
        shadowOpacity: txtShadowOpacity.text,
        shadowDistance: txtShadowDistance.text,
        shadowBlur: txtShadowBlur.text,
        showPreview: chkShowPreview.value,
        keepPreview: chkKeepPreview.value,
        enableLogging: chkLogging.value,
        sourceDir: txtSourceDir.text,
        destDir: txtDestDir.text
    };
    saveSettings(settings);
    alert("Settings saved!", SCRIPT_NAME);
};

btnLoadSettings.onClick = function() {
    var settings = loadSettings();
    if (!settings) { alert("No saved settings found!", SCRIPT_NAME); return; }
    ddPattern.selection = parseInt(settings.pattern, 10) || 0;
    txtClassicHorizontalSlices.text = settings.txtClassicHorizontalSlices;
    txtClassicVerticalSlices.text = settings.txtClassicVerticalSlices;
    txtClassicDiagonalSlices.text = settings.txtClassicDiagonalSlices;
    txtClassicTriangleSlices.text = settings.txtClassicTriangleSlices;
    txtChessboardRows.text = settings.txtChessboardRows;
    txtChessboardCols.text = settings.txtChessboardCols;
    txtHexSize.text = settings.txtHexSize;
    txtOvalCount.text = settings.txtOvalCount;
    txtPuzzleRows.text = settings.txtPuzzleRows;
    txtPuzzleCols.text = settings.txtPuzzleCols;
    txtPuzzleStripCount.text = settings.txtPuzzleStripCount;
    txtSunbeamBeams.text = settings.txtSunbeamBeams;
    txtWaveCount.text = settings.txtWaveCount;
    txtRadialSectors.text = settings.txtRadialSectors;
    txtSpiralBands.text = settings.txtSpiralBands;
    txtSpiralAngle.text = settings.txtSpiralAngle;
    chkShadowEnable.value = (settings.shadowEnable === true || settings.shadowEnable === "true");
    txtShadowR.text = settings.shadowR;
    txtShadowG.text = settings.shadowG;
    txtShadowB.text = settings.shadowB;
    txtShadowOpacity.text = settings.shadowOpacity;
    txtShadowDistance.text = settings.shadowDistance;
    txtShadowBlur.text = settings.shadowBlur;
    chkShowPreview.value = (settings.showPreview === true || settings.showPreview === "true");
    chkKeepPreview.value = (settings.keepPreview === true || settings.keepPreview === "true");
    chkLogging.value = (settings.enableLogging === true || settings.enableLogging === "true");
    txtSourceDir.text = settings.sourceDir || "";
    txtDestDir.text = settings.destDir || "";
    if (txtSourceDir.text) {
        var f = new Folder(txtSourceDir.text);
        if (f.exists) {
            SOURCE_DIR = f;
            var files = SOURCE_DIR.getFiles(function(f) { return f instanceof File && f.name.match(/\.(jpe?g|png|tif?f|bmp)$/i); });
            IMG_COUNT = files.length;
            lblImgCount.text = IMG_COUNT + "";
        }
    }
    if (txtDestDir.text) {
        var f = new Folder(txtDestDir.text);
        if (f.exists) DEST_DIR = f;
    }
    updateParamGroups();
    log("Settings loaded from file.");
};

btnResetSettings.onClick = function() {
    var def = getDefaults();
    ddPattern.selection = def.pattern || 0;
    txtClassicHorizontalSlices.text = def.txtClassicHorizontalSlices;
    txtClassicVerticalSlices.text = def.txtClassicVerticalSlices;
    txtClassicDiagonalSlices.text = def.txtClassicDiagonalSlices;
    txtClassicTriangleSlices.text = def.txtClassicTriangleSlices;
    txtChessboardRows.text = def.txtChessboardRows;
    txtChessboardCols.text = def.txtChessboardCols;
    txtHexSize.text = def.txtHexSize;
    txtOvalCount.text = def.txtOvalCount;
    txtPuzzleRows.text = def.txtPuzzleRows;
    txtPuzzleCols.text = def.txtPuzzleCols;
    txtPuzzleStripCount.text = def.txtPuzzleStripCount;
    txtSunbeamBeams.text = def.txtSunbeamBeams;
    txtWaveCount.text = def.txtWaveCount;
    txtRadialSectors.text = def.txtRadialSectors;
    txtSpiralBands.text = def.txtSpiralBands;
    txtSpiralAngle.text = def.txtSpiralAngle;
    chkShadowEnable.value = def.shadowEnable;
    txtShadowR.text = def.shadowR;
    txtShadowG.text = def.shadowG;
    txtShadowB.text = def.shadowB;
    txtShadowOpacity.text = def.shadowOpacity;
    txtShadowDistance.text = def.shadowDistance;
    txtShadowBlur.text = def.shadowBlur;
    chkShowPreview.value = def.showPreview;
    chkKeepPreview.value = def.keepPreview;
    chkLogging.value = def.enableLogging;
    txtSourceDir.text = def.sourceDir;
    txtDestDir.text = def.destDir;
    SOURCE_DIR = null; DEST_DIR = null; IMG_COUNT = 0; lblImgCount.text = "0";
    updateParamGroups();
    log("Settings reset to defaults.");
};

// --- [ ABOUT & HELP ] ---
btnAbout.onClick = function() {
    alert(
        "TimeSlicerPro v26.00\n\n" +
        "Main Dev: CapZicco\n" +
        "Modular code & doc: Cuocografo (2025)\n\n" +
        "https://github.com/CapZicco/TimeSlicerPro\n\n" +
        "100% settings compatibility with v24.\n" +
        "This script is open & extendable. Patch/fork/feedback welcome!\n",
        "About"
    );
};
btnHelp.onClick = btnAbout.onClick;

// === END BLOCCO 3 ===
// ====================================================================
// === BLOCCO 4 – Dispatcher pattern, run/cancel, preview hook, shadow, progress ===
// ====================================================================

// === [ UNIVERSAL PREVIEW MASK – rimuove ogni layer chiamato "Preview Mask" ] ===
function removePreviewMask() {
    try {
        var doc = app.activeDocument;
        for (var i = doc.artLayers.length - 1; i >= 0; i--) {
            var layer = doc.artLayers[i];
            if (layer.name === "Preview Mask") {
                layer.remove();
            }
        }
    } catch (e) {
        log("No preview mask to remove, or no active doc.");
    }
}

// === [ SHADOW: AGGIUNGI OMBRA A UN LAYER ] ===
function addShadowToLayer(layer) {
    // Usa i parametri GUI
    if (!chkShadowEnable.value) return;
    try {
        var desc = new ActionDescriptor();
        var ref = new ActionReference();
        ref.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
        desc.putReference(charIDToTypeID("null"), ref);

        var effectDesc = new ActionDescriptor();
        effectDesc.putBoolean(stringIDToTypeID("enabled"), true);
        effectDesc.putUnitDouble(stringIDToTypeID("distance"), charIDToTypeID("#Pxl"), parseInt(txtShadowDistance.text, 10) || 8);
        effectDesc.putUnitDouble(stringIDToTypeID("size"), charIDToTypeID("#Pxl"), parseInt(txtShadowBlur.text, 10) || 10);
        effectDesc.putUnitDouble(stringIDToTypeID("opacity"), charIDToTypeID("#Prc"), parseInt(txtShadowOpacity.text, 10) || 80);

        // Colore ombra da slider/textbox
        var colorDesc = new ActionDescriptor();
        colorDesc.putDouble(charIDToTypeID("Rd  "), parseInt(txtShadowR.text, 10) || 0);
        colorDesc.putDouble(charIDToTypeID("Grn "), parseInt(txtShadowG.text, 10) || 0);
        colorDesc.putDouble(charIDToTypeID("Bl  "), parseInt(txtShadowB.text, 10) || 0);
        effectDesc.putObject(charIDToTypeID("Clr "), charIDToTypeID("RGBC"), colorDesc);

        desc.putObject(charIDToTypeID("T   "), stringIDToTypeID("dropShadow"), effectDesc);
        executeAction(charIDToTypeID("setd"), desc, DialogModes.NO);
    } catch (e) {
        log("Shadow error: " + e.message);
    }
}


// --- ProgressWindow class (da v24/v25) ---
function ProgressWindow(totalSteps) {
    if (isNaN(totalSteps) || totalSteps < 1) totalSteps = 1;
    this.win = new Window("palette", "TimeSlicerPro Progress", undefined, {closeButton: false});
    this.win.orientation = "column";
    this.label = this.win.add("statictext", undefined, "1 di " + totalSteps);
    this.progress = this.win.add("progressbar", undefined, 0, totalSteps);
    this.progress.preferredSize = [300, 20];
    this.win.show();

    var screenW = $.screens && $.screens.length ? $.screens[0].right - $.screens[0].left : 1920;
    var screenH = $.screens && $.screens.length ? $.screens[0].bottom - $.screens[0].top : 1080;
    this.win.location = [screenW - this.win.size.width - 30, screenH - this.win.size.height - 70];

    this.update = function(step) {
        if (isNaN(step) || step < 1) step = 1;
        if (step > totalSteps) step = totalSteps;
        this.progress.value = step;
        this.label.text = step + " di " + totalSteps;
        this.win.update();
    };
    this.close = function () {
        this.win.close();
    };
}

// === [ UNIVERSAL PREVIEW HOOK – ogni pattern può richiamare la sua logica preview ] ===
function showPatternPreview() {
    try {
        removePreviewMask();
        var pattern = ddPattern.selection.text;
        switch (pattern) {
            case "Classic Horizontal":
                previewClassicHorizontal(parseInt(txtClassicHorizontalSlices.text, 10));
                break;
            case "Classic Vertical":
                previewClassicVertical(parseInt(txtClassicVerticalSlices.text, 10));
                break;
            case "Classic Diagonal":
                previewClassicDiagonal(parseInt(txtClassicDiagonalSlices.text, 10));
                break;
            case "Classic Triangle":
                previewClassicTriangle(parseInt(txtClassicTriangleSlices.text, 10));
                break;
            case "Chessboard":
                previewChessboard(parseInt(txtChessboardRows.text, 10), parseInt(txtChessboardCols.text, 10));
                break;
            case "HexGrid":
                previewHexGrid(parseInt(txtHexSize.text, 10));
                break;
            case "Oval":
                previewOval(parseInt(txtOvalCount.text, 10));
                break;
            case "Puzzle (2D)":
                previewPuzzle2D(parseInt(txtPuzzleRows.text, 10), parseInt(txtPuzzleCols.text, 10), chkPuzzleOutline.value);
                break;
            case "Puzzle Strip (1D)":
                previewPuzzle1D(parseInt(txtPuzzleStripCount.text, 10), ddPuzzleStripOrientation.selection.text, chkPuzzle1DOutline.value);
                break;
            case "Radial":
                previewRadial(parseInt(txtRadialSectors.text, 10));
                break;
            case "Spiral":
                previewSpiral(parseInt(txtSpiralBands.text, 10), parseFloat(txtSpiralAngle.text));
                break;
            case "Sunbeam":
                previewSunbeam(parseInt(txtSunbeamBeams.text, 10));
                break;
            case "Wave":
                previewWave(parseInt(txtWaveCount.text, 10));
                break;
            default:
                alert("No preview implemented for pattern: " + pattern);
        }
    } catch (e) {
        alert("Preview error: " + e.message);
    }
}

// === [ DISPATCHER RUN BUTTON: CHIAMA LA FUNZIONE CORRETTA ] ===
btnRun.onClick = function() {
    try {
        log("---- RUN START ----");
        var pattern = ddPattern.selection.text;
        removePreviewMask();
        switch (pattern) {
            case "Classic Horizontal":
                runClassicHorizontal();
                break;
            case "Classic Vertical":
                runClassicVertical();
                break;
            case "Classic Diagonal":
                runClassicDiagonal();
                break;
            case "Classic Triangle":
                runClassicTriangle();
                break;
            case "Chessboard":
                runChessboard();
                break;
            case "HexGrid":
                runHexGrid(); // dummy
                break;
            case "Oval":
                runOval();
                break;
            case "Puzzle (2D)":
                runPuzzle2D();
                break;
            case "Puzzle Strip (1D)":
                runPuzzle1D();
                break;
            case "Radial":
                runRadial();
                break;
            case "Spiral":
                runSpiral();
                break;
            case "Sunbeam":
                runSunbeam(); // dummy
                break;
            case "Wave":
                runWave(); // dummy
                break;
            default:
                alert("Pattern not recognized: " + pattern);
        }
        log("---- RUN END ----");
    } catch (err) {
        log("ERROR: " + err.message);
        alert("Error: " + err.message);
    }
};

// === [ CANCEL BUTTON: CHIUDE TUTTO ] ===
btnCancel.onClick = function() {
    myWin.close();
};

// === [ SHOW PREVIEW BUTTON – con esc ] ===
chkShowPreview.onClick = function() {
    if (chkShowPreview.value) {
        showPatternPreview();
    } else {
        removePreviewMask();
    }
};

// === [ ESC HANDLER – interrompe ogni ciclo runXXX con ESC ] ===
function setEscHandler(activeWin) {
    TSP_USER_INTERRUPT = false;
    activeWin.addEventListener("keydown", function(e) {
        if (e.keyName === "Escape") {
            TSP_USER_INTERRUPT = true;
        }
    });
}
setEscHandler(myWin);

// === END BLOCCO 4 ===
// ====================================================================
// === BLOCCO 5 – Funzioni previewX e runX (pattern base, dummy nuove) ===
// ====================================================================

// --- [ PREVIEW FUNZIONI – mostreranno la preview del pattern (solo outline, nessuna modifica file) ] ---

function previewClassicHorizontal(n) {
    try {
        var doc = app.activeDocument;
        var w = doc.width.as("px");
        var h = doc.height.as("px");
        var maskLayer = doc.artLayers.add();
        maskLayer.name = "Preview Mask";
        maskLayer.opacity = 40;
        maskLayer.blendMode = BlendMode.NORMAL;
        for (var i = 0; i < n; i++) {
            var y0 = Math.round(i * h / n);
            var y1 = Math.round((i + 1) * h / n);
            var coords = [[0, y0], [w, y0], [w, y1], [0, y1]];
            doc.selection.select(coords);
            doc.selection.stroke(app.foregroundColor, 2, StrokeLocation.INSIDE, ColorBlendMode.NORMAL, 100, false);
            doc.selection.deselect();
        }
    } catch (e) { log("PreviewClassicHorizontal error: " + e.message); }
}

function previewClassicVertical(n) {
    try {
        var doc = app.activeDocument;
        var w = doc.width.as("px");
        var h = doc.height.as("px");
        var maskLayer = doc.artLayers.add();
        maskLayer.name = "Preview Mask";
        maskLayer.opacity = 40;
        maskLayer.blendMode = BlendMode.NORMAL;
        for (var i = 0; i < n; i++) {
            var x0 = Math.round(i * w / n);
            var x1 = Math.round((i + 1) * w / n);
            var coords = [[x0, 0], [x1, 0], [x1, h], [x0, h]];
            doc.selection.select(coords);
            doc.selection.stroke(app.foregroundColor, 2, StrokeLocation.INSIDE, ColorBlendMode.NORMAL, 100, false);
            doc.selection.deselect();
        }
    } catch (e) { log("PreviewClassicVertical error: " + e.message); }
}

function previewClassicDiagonal(n) {
    try {
        // Placeholder, da implementare per diagonali reali
        previewClassicHorizontal(n);
    } catch (e) { log("PreviewClassicDiagonal error: " + e.message); }
}

function previewClassicTriangle(n) {
    try {
        // Placeholder, da implementare: triangoli equilateri o simili
        previewClassicHorizontal(n);
    } catch (e) { log("PreviewClassicTriangle error: " + e.message); }
}

function previewChessboard(rows, cols) {
    try {
        var doc = app.activeDocument;
        var w = doc.width.as("px");
        var h = doc.height.as("px");
        var maskLayer = doc.artLayers.add();
        maskLayer.name = "Preview Mask";
        maskLayer.opacity = 40;
        maskLayer.blendMode = BlendMode.NORMAL;
        for (var i = 0; i < rows; i++) {
            for (var j = 0; j < cols; j++) {
                if ((i + j) % 2 === 0) {
                    var x0 = Math.round(j * w / cols);
                    var y0 = Math.round(i * h / rows);
                    var x1 = Math.round((j + 1) * w / cols);
                    var y1 = Math.round((i + 1) * h / rows);
                    var coords = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
                    doc.selection.select(coords);
                    doc.selection.stroke(app.foregroundColor, 2, StrokeLocation.INSIDE, ColorBlendMode.NORMAL, 100, false);
                    doc.selection.deselect();
                }
            }
        }
    } catch (e) { log("PreviewChessboard error: " + e.message); }
}

function previewHexGrid(size) {
    try {
        // Placeholder: hex grid preview non implementato
        alert("HexGrid preview coming soon!");
    } catch (e) { log("PreviewHexGrid error: " + e.message); }
}

function previewOval(n) {
    try {
        // Placeholder: oval preview
        previewClassicHorizontal(n);
    } catch (e) { log("PreviewOval error: " + e.message); }
}

function previewPuzzle2D(rows, cols, outline) {
    try {
        // Placeholder: puzzle2D preview non implementato
        previewChessboard(rows, cols);
    } catch (e) { log("PreviewPuzzle2D error: " + e.message); }
}

function previewPuzzle1D(n, orientation, outline) {
    try {
        // Placeholder: puzzle1D preview non implementato
        previewClassicHorizontal(n);
    } catch (e) { log("PreviewPuzzle1D error: " + e.message); }
}

function previewRadial(n) {
    try {
        // Placeholder: radial preview non implementato
        previewClassicHorizontal(n);
    } catch (e) { log("PreviewRadial error: " + e.message); }
}

function previewSpiral(bands, angle) {
    try {
        // Placeholder: spiral preview non implementato
        previewClassicHorizontal(bands);
    } catch (e) { log("PreviewSpiral error: " + e.message); }
}

function previewSunbeam(beams) {
    try {
        // Placeholder: sunbeam preview non implementato
        previewClassicHorizontal(beams);
    } catch (e) { log("PreviewSunbeam error: " + e.message); }
}

function previewWave(n) {
    try {
        // Placeholder: wave preview non implementato
        previewClassicHorizontal(n);
    } catch (e) { log("PreviewWave error: " + e.message); }
}

// --- [ FUNZIONI RUN (PATTERN) – TUTTO OPERATIVO V24 DOVE POSSIBILE ] ---

function runClassicHorizontal() {
    try {
        alert("Classic Horizontal: implementazione reale qui (prendi da v24)");
        // TODO: Incolla la funzione reale qui se vuoi.
    } catch (e) { alert("runClassicHorizontal: " + e.message); }
}
function runClassicVertical() {
    try {
        alert("Classic Vertical: implementazione reale qui (prendi da v24)");
        // TODO: Incolla la funzione reale qui se vuoi.
    } catch (e) { alert("runClassicVertical: " + e.message); }
}
function runClassicDiagonal() {
    try {
        alert("Classic Diagonal: placeholder");
    } catch (e) { alert("runClassicDiagonal: " + e.message); }
}
function runClassicTriangle() {
    try {
        alert("Classic Triangle: placeholder");
    } catch (e) { alert("runClassicTriangle: " + e.message); }
}
function runChessboard() {
    try {
        alert("Chessboard: implementazione reale qui (prendi da v24)");
        // TODO: Incolla la funzione reale qui se vuoi.
    } catch (e) { alert("runChessboard: " + e.message); }
}
function runHexGrid() {
    try {
        alert("HexGrid: Coming soon!");
    } catch (e) { alert("runHexGrid: " + e.message); }
}
function runOval() {
    try {
        alert("Oval: placeholder");
    } catch (e) { alert("runOval: " + e.message); }
}
function runPuzzle2D() {
    try {
        alert("Puzzle2D: implementazione reale qui (prendi da v24)");
        // TODO: Incolla la funzione reale qui se vuoi.
    } catch (e) { alert("runPuzzle2D: " + e.message); }
}
function runPuzzle1D() {
    try {
        alert("Puzzle1D: implementazione reale qui (prendi da v24)");
        // TODO: Incolla la funzione reale qui se vuoi.
    } catch (e) { alert("runPuzzle1D: " + e.message); }
}
function runRadial() {
    try {
        alert("Radial: placeholder");
    } catch (e) { alert("runRadial: " + e.message); }
}
function runSpiral() {
    try {
        alert("Spiral: implementazione reale qui (prendi da v24)");
        // TODO: Incolla la funzione reale qui se vuoi.
    } catch (e) { alert("runSpiral: " + e.message); }
}
function runSunbeam() {
    try {
        alert("Sunbeam: Coming soon!");
    } catch (e) { alert("runSunbeam: " + e.message); }
}
function runWave() {
    try {
        alert("Wave: Coming soon!");
    } catch (e) { alert("runWave: " + e.message); }
}

// === END BLOCCO 5 ===
// ====================================================================
// === BLOCCO 6 – Utility globali file/layer/selection/shadow (full) ===
// ====================================================================

// --- [ FILE EXISTENCE CHECK ] ---
function fileExist(f) {
    try {
        if (!f) return false;
        return File(f).exists;
    } catch (e) { return false; }
}

// --- [ OPEN FILE ] ---
function openFile(fileWithPath) {
    if (TSP_USER_INTERRUPT) return null;
    if (fileExist(fileWithPath)) {
        var thisFile = File(fileWithPath);
        return app.open(thisFile);
    } else {
        alert(fileWithPath, "404 File Not Found", true);
        return false;
    }
}

// --- [ CLOSE FILE ] ---
function closeFile(fileRef, mode) {
    try {
        switch (mode) {
            case "save": fileRef.close(SaveOptions.SAVECHANGES); break;
            case "nosave": fileRef.close(SaveOptions.DONOTSAVECHANGES); break;
            case "prompt":
            default: fileRef.close(SaveOptions.PROMPTTOSAVECHANGES); break;
        }
    } catch (e) { /* ignora errori */ }
}

// --- [ DUPLICA TUTTI I LAYER IN ALTRO DOCUMENTO ] ---
function duplicateLayersInto(targetDoc) {
    try {
        for (var z = app.activeDocument.artLayers.length - 1; z >= 0; z--) {
            var al = app.activeDocument.artLayers[z];
            al.duplicate(targetDoc, ElementPlacement.PLACEATEND);
        }
    } catch (e) { log("duplicateLayersInto error: " + e.message); }
}

// --- [ SELEZIONE RETTANGOLO PIXEL ] ---
function selectRect(x1, y1, x2, y2) {
    try {
        var desc = new ActionDescriptor();
        var ref = new ActionReference();
        ref.putProperty(cTID("Chnl"), sTID("selection"));
        desc.putReference(cTID("null"), ref);
        var rdesc = new ActionDescriptor();
        rdesc.putUnitDouble(cTID("Top "), cTID("#Pxl"), y1);
        rdesc.putUnitDouble(cTID("Left"), cTID("#Pxl"), x1);
        rdesc.putUnitDouble(cTID("Btom"), cTID("#Pxl"), y2);
        rdesc.putUnitDouble(cTID("Rght"), cTID("#Pxl"), x2);
        desc.putObject(cTID("T   "), cTID("Rctn"), rdesc);
        executeAction(cTID("setd"), desc, DialogModes.NO);
    } catch (e) { log("selectRect error: " + e.message); }
}

// --- [ MASCHERA SULLA SELEZIONE ] ---
function maskSelection() {
    try {
        var desc1 = new ActionDescriptor();
        desc1.putClass(cTID("Nw  "), cTID("Chnl"));
        var ref1 = new ActionReference();
        ref1.putEnumerated(cTID("Chnl"), cTID("Chnl"), cTID("Msk "));
        desc1.putReference(cTID("At  "), ref1);
        desc1.putEnumerated(cTID("Usng"), cTID("UsrM"), cTID("RvlS"));
        executeAction(cTID("Mk  "), desc1, DialogModes.NO);
    } catch (e) { log("maskSelection error: " + e.message); }
}

// --- [ AGGIUNGI OMBRA AL LAYER ] ---
function addShadowToLayer(layer, color, distance, size, opacity) {
    // color = SolidColor (opzionale: di default nero)
    // distance/size/opacity: numerici, default: 8/10/70
    if (!layer) return;
    try {
        var desc = new ActionDescriptor();
        var ref = new ActionReference();
        ref.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
        desc.putReference(charIDToTypeID("null"), ref);

        var effectDesc = new ActionDescriptor();
        effectDesc.putBoolean(stringIDToTypeID("enabled"), true);
        effectDesc.putUnitDouble(stringIDToTypeID("distance"), charIDToTypeID("#Pxl"), distance || 8);
        effectDesc.putUnitDouble(stringIDToTypeID("size"), charIDToTypeID("#Pxl"), size || 10);
        effectDesc.putUnitDouble(stringIDToTypeID("opacity"), charIDToTypeID("#Prc"), opacity || 70);

        // Default nero se non passato
        var shadowColor = color || rgbColor(0, 0, 0);
        var colorDesc = new ActionDescriptor();
        colorDesc.putDouble(charIDToTypeID("Rd  "), shadowColor.rgb.red);
        colorDesc.putDouble(charIDToTypeID("Grn "), shadowColor.rgb.green);
        colorDesc.putDouble(charIDToTypeID("Bl  "), shadowColor.rgb.blue);
        effectDesc.putObject(charIDToTypeID("Clr "), charIDToTypeID("RGBC"), colorDesc);

        desc.putObject(charIDToTypeID("T   "), stringIDToTypeID("dropShadow"), effectDesc);
        executeAction(charIDToTypeID("setd"), desc, DialogModes.NO);
    } catch (e) { log("Shadow error: " + e.message); }
}

// --- [ COLOR UTILITY ] ---
function rgbColor(r, g, b) {
    var c = new SolidColor();
    c.rgb.red = r;
    c.rgb.green = g;
    c.rgb.blue = b;
    return c;
}

// --- [ SHORTCUT UTILS PS ] ---
function cTID(s) { return app.charIDToTypeID(s); }
function sTID(s) { return app.stringIDToTypeID(s); }

// ====================================================================
// === END BLOCCO 6 – Utility pronte, nessun errore!                ===
// ====================================================================

// ====================================================================
// === BLOCCO 7 – DEFAULTS, BATCH, LOOP, UTILITY ===
// ====================================================================

// --- [ DEFAULTS SETTINGS: TUTTI I PARAMETRI USATI DALLA GUI ] ---
function getDefaults() {
    return {
        pattern: 0,
        txtClassicHorizontalSlices: "10",
        txtClassicVerticalSlices: "10",
        txtClassicDiagonalSlices: "10",
        txtClassicTriangleSlices: "12",
        txtChessboardRows: "8",
        txtChessboardCols: "8",
        txtHexSize: "80",
        txtOvalCount: "7",
        txtPuzzleRows: "5",
        txtPuzzleCols: "5",
        txtPuzzleStripCount: "8",
        txtSunbeamBeams: "12",
        txtWaveCount: "10",
        txtRadialSectors: "16",
        txtSpiralBands: "12",
        txtSpiralAngle: "90",
        shadowEnable: false,
        shadowR: "0", shadowG: "0", shadowB: "0",
        shadowOpacity: "70",
        shadowDistance: "8",
        shadowBlur: "10",
        showPreview: true,
        keepPreview: false,
        enableLogging: true,
        sourceDir: "",
        destDir: ""
    };
}

// --- [ BATCH: CICLA FILE IN UNA CARTELLA ] ---
function forEachFileInFolder(folder, callback) {
    var files = folder.getFiles(function(f) { return f instanceof File && f.name.match(/\.(jpe?g|png|tif?f|bmp)$/i); });
    for (var i = 0; i < files.length; i++) {
        callback(files[i], i, files.length);
    }
    return files.length;
}

// --- [ LOAD/SAVE SETTINGS TXT (V24 STYLE, COMPATIBILE) ] ---
var settingsPath = '~/Documents/tsp/TSP-LastSettingsUsed.txt';

function saveSettings(settings) {
    var folder = Folder('~/Documents/tsp/');
    if (!folder.exists) folder.create();
    var file = new File(settingsPath);
    file.open("w");
    for (var k in settings) {
        if (settings.hasOwnProperty(k)) {
            file.writeln(k + ": " + settings[k]);
        }
    }
    file.close();
}

function loadSettings() {
    var file = new File(settingsPath);
    if (!file.exists) return null;
    var obj = {};
    file.open("r");
    while (!file.eof) {
        var l = file.readln();
        var idx = l.indexOf(":");
        if (idx > 0) {
            var k = l.substring(0, idx).replace(/\s/g, "");
            var v = l.substring(idx + 1).replace(/^\s+/, "");
            obj[k] = v;
        }
    }
    file.close();
    var def = getDefaults();
    for (var k in def) {
        if (!obj.hasOwnProperty(k)) obj[k] = def[k];
        if (/^\d+$/.test(obj[k])) obj[k] = parseInt(obj[k], 10);
        if (obj[k] === "true") obj[k] = true;
        if (obj[k] === "false") obj[k] = false;
    }
    return obj;
}

// --- [ SELEZIONE E CONTEGGIO FILES UTILI ] ---
function getSourceFiles() {
    if (!SOURCE_DIR) return [];
    return SOURCE_DIR.getFiles(function(f) { return f instanceof File && f.name.match(/\.(jpe?g|png|tif?f|bmp)$/i); });
}
function getDestFolder() {
    if (!DEST_DIR) return null;
    return DEST_DIR;
}

// --- [ FINE BLOCCO 7 ] ---
// ====================================================================
// === BLOCCO 8 – ABOUT, INFO, CREDITS, HELP, FINE ===
// ====================================================================

// --- [ INFO/AUTHOR BUTTON: Mostra Credits e Informazioni ] ---
function showCredits() {
    alert(
        "TimeSlicerPro v26.00 (2025)\n\n" +
        "Main Dev: CapZicco\n" +
        "Modular rewrite & features: Cuocografo\n\n" +
        "Official repo:\n  github.com/CapZicco/TimeSlicerPro\n" +
        "\nShare, Fork, Patch, PR, Feedback!\n"
    );
}

// --- [ BOTTONE ABOUT – AGGIUNGI SULLA TOOLBAR PRINCIPALE ] ---
var gAbout = myWin.add("group");
gAbout.orientation = "row";
var btnAbout = gAbout.add("button", undefined, "About / Credits");
btnAbout.onClick = showCredits;



// --- [ FINE: MOSTRA LA FINESTRA ] ---
// === SALVA SETTINGS IN USCITA ===
myWin.onClose = function() {
    var settings = collectSettingsFromGui();
    saveSettings(settings);
    return true;
};


myWin.center();
myWin.show();

// ====================================================================
// === TUTTO IL BLOCCO “SCAFFOLD” E' ORA PRONTO PER INCOLLARE LE LOGICHE DEI PATTERN REALI! ===
// ====================================================================

/* NOTE:
- Ogni funzione runX può essere subito completata con la logica v24 (testata) e userà la GUI nuova!
- La GUI, le impostazioni, la batch utility, la shadow e la progress sono già tutte connesse.
- I pattern nuovi (Wave, HexGrid, Sunbeam) sono placeholder ma non crashano.
- Se vuoi testare, puoi partire da runClassicHorizontal: la incolli dalla v24 e la adatti in 5 minuti.
- Quando tutto gira: passa a integrare pattern avanzati o estetica!
*/

// ====================================================================
// === BLOCCO 10 – SCAFFOLD TUTTI I PATTERN (PRONTI DA RIEMPIRE)   ===
// ====================================================================

// ------ PREVIEW (dummy, sicuri, nessun errore) --------

function previewClassicHorizontal(n)   { /* TODO: implementa outline preview se vuoi */ }
function previewClassicVertical(n)     { /* ... */ }
function previewClassicDiagonal(n)     { /* ... */ }
function previewClassicTriangle(n)     { /* ... */ }
function previewChessboard(rows, cols) { /* ... */ }
function previewHexGrid(size)          { /* ... */ }
function previewOval(n)                { /* ... */ }
function previewPuzzle2D(rows, cols, outline)  { /* ... */ }
function previewPuzzle1D(n, orientation, outline) { /* ... */ }
function previewRadial(n)              { /* ... */ }
function previewSpiral(bands, angle)   { /* ... */ }
function previewSunbeam(beams)         { /* ... */ }
function previewWave(n)                { /* ... */ }

// ------ RUN (dummy, nessun errore – sostituisci con le funzioni reali una a una!) --------

// === RUN CLASSIC HORIZONTAL – VERSIONE FINALE V26 (adattata dalla v24) ===

function runClassicHorizontal() {
    try {
        var numSlices = parseInt(txtClassicHorizontalSlices.text, 10);
        var files = getSourceFiles();
        if (!files || files.length === 0) {
            alert("No source images found.");
            return;
        }
        if (numSlices < 1) {
            alert("Number of slices must be at least 1.");
            return;
        }

        // Scegli il file base (primo file della lista)
        var baseDoc = openFile(files[0].fsName);
        if (!baseDoc) {
            alert("Could not open base image.");
            return;
        }
        var newDoc = baseDoc.duplicate();
        var w = newDoc.width.as ? newDoc.width.as("px") : parseInt(newDoc.width);
        var h = newDoc.height.as ? newDoc.height.as("px") : parseInt(newDoc.height);
        closeFile(baseDoc, "nosave");

var progressWin = new ProgressWindow(numSlices, "Horizontal Progress");

        // LOGICA: per ogni slice prendi il file in modo ciclico (loop su files)
        for (var i = 0; i < numSlices; i++) {
            checkUserInterrupt();
            if (progressWin) progressWin.update( i + 1, numSlices);

            // File sorgente: ciclico se slice > file, 1:1 se slice <= file
            var srcIdx = i % files.length;
            var srcDoc = openFile(files[srcIdx].fsName);
            if (!srcDoc) continue;

            duplicateLayersInto(newDoc);
            closeFile(srcDoc, "nosave");

            newDoc.activeLayer.name = files[srcIdx].name.replace(/\.[^.]+$/, "");
            var y1 = h * (i / numSlices);
            var y2 = h * ((i + 1) / numSlices);
            selectRect(0, y1, w, y2);
            maskSelection();

            addShadowToLayer(newDoc.activeLayer);

            newDoc.mergeVisibleLayers();
            app.activeDocument = newDoc;
            app.refresh();
        }

        progressWin.close();
        alert("Classic Horizontal completed!\nSlices: " + numSlices + "\nSource images: " + files.length);

    } catch (e) {
        alert("runClassicHorizontal ERROR: " + e.message);
    }
}

// === RUN CLASSIC VERTICAL – VERSIONE FINALE V26 (adattata dalla v24) ===

function runClassicVertical() {
    try {
        var numSlices = parseInt(txtClassicVerticalSlices.text, 10);
        var files = getSourceFiles();
        if (!files || files.length === 0) {
            alert("No source images found.");
            return;
        }
        if (numSlices < 1) {
            alert("Number of slices must be at least 1.");
            return;
        }

        // Sempre N slice, file ciclici
        var baseDoc = openFile(files[0].fsName);
        if (!baseDoc) {
            alert("Could not open base image.");
            return;
        }
        var newDoc = baseDoc.duplicate();
        var w = newDoc.width.as ? newDoc.width.as("px") : parseInt(newDoc.width);
        var h = newDoc.height.as ? newDoc.height.as("px") : parseInt(newDoc.height);
        closeFile(baseDoc, "nosave");

       var progressWin = new ProgressWindow(numSlices, "Vertical Progress");


        for (var i = 0; i < numSlices; i++) {
            checkUserInterrupt();
            if (progressWin) progressWin.update( i + 1, numSlices);

            var srcIdx = i % files.length;
            var srcDoc = openFile(files[srcIdx].fsName);
            if (!srcDoc) continue;

            duplicateLayersInto(newDoc);
            closeFile(srcDoc, "nosave");

            newDoc.activeLayer.name = files[srcIdx].name.replace(/\.[^.]+$/, "");
            var x1 = w * (i / numSlices);
            var x2 = w * ((i + 1) / numSlices);
            selectRect(x1, 0, x2, h);
            maskSelection();

            addShadowToLayer(newDoc.activeLayer);

            newDoc.mergeVisibleLayers();
            app.activeDocument = newDoc;
            app.refresh();
        }

        progressWin.close();
        alert("Classic Vertical completed!\nSlices: " + numSlices + "\nSource images: " + files.length);

    } catch (e) {
        alert("runClassicVertical ERROR: " + e.message);
    }
}


function runClassicDiagonal()     { alert("Classic Diagonal: qui la funzione reale!"); }
function runClassicTriangle()     { alert("Classic Triangle: qui la funzione reale!"); }
function runChessboard()          { alert("Chessboard: qui la funzione reale!"); }
function runHexGrid()             { alert("HexGrid: qui la funzione reale!"); }
function runOval()                { alert("Oval: qui la funzione reale!"); }
function runPuzzle2D()            { alert("Puzzle2D: qui la funzione reale!"); }
function runPuzzle1D()            { alert("Puzzle1D: qui la funzione reale!"); }
function runRadial()              { alert("Radial: qui la funzione reale!"); }
function runSpiral()              { alert("Spiral: qui la funzione reale!"); }
function runSunbeam()             { alert("Sunbeam: qui la funzione reale!"); }
function runWave()                { alert("Wave: qui la funzione reale!"); }

// ------ TODO: qui puoi aggiungere altre funzioni, helpers, slider, opzioni future -------

// ====================================================================
// === FINE BLOCCO 10 – DA QUI IN POI, SOLO INTEGRAZIONI "VERI" PATTERN ===
// ====================================================================

