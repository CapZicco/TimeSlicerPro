// ====================================================================
// === TimeSlicerPro v26.03 – Modular & Complete – CapZicco & Copilot – 2025 ===
// ====================================================================
//
// Based on v24. Internationalized, modular, robust settings, batch support.
// ====================================================================

// === [ CREDITS / INFO ] ===
/*
    Script created by CapZicco, modular rewrite and features by Copilot (2025)
    Official repo: https://github.com/CapZicco/TimeSlicerPro
    Collaborators welcome!
*/

// === [ GLOBAL CONSTANTS & FLAGS ] ===
var SCRIPT_NAME = "TimeSlicerPro";
var SCRIPT_VERSION = "v26.03";

// === Logging mode (checkbox in GUI, default true) ===
var DEBUG_MODE = true;

// === Global: source/destination directories ===
var SOURCE_DIR = null;
var DEST_DIR = null;

// === Image counter (updates on source select) ===
var IMG_COUNT = 0;

// === SETTINGS PATH ===
var settingsFolderPath = '~/Documents/tsp/';
var lastSettingsFileName = "TSP-LastSettingsUsed.txt";
var LAST_SETTINGS_PATH = settingsFolderPath + lastSettingsFileName;


// Caricamento automatico dei settings
function loadSettingsObject() {
    var file = new File(LAST_SETTINGS_PATH);
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

// Funzione per chiudere tutti i documenti aperti in Photoshop
function closeAllDocs(confirmMsg) {
    if (app.documents.length === 0) return;
    var doClose = confirm(confirmMsg || "Do you want to close all images open in Photoshop?");
    if (doClose) {
        while (app.documents.length) {
            app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
        }
    }
}

// Caricamento manuale dei settings tramite dialog: mostra solo .txt nella cartella giusta
function loadSettingsWithPicker() {
    var folder = Folder(settingsFolderPath);
    if (!folder.exists) folder.create();
    // RIMUOVI queste due righe:
    // var oldFolder = Folder.current;
    // Folder.current = folder;
    // Passa la cartella direttamente al dialog:
    var file = File.openDialog("Select settings file:", "*.txt", folder);
    // Folder.current = oldFolder; // togli questa riga
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

// Salvataggio manuale tramite pulsante "Save" (collegalo al tuo btnSaveSettings)
function saveSettingsWithDialog() {
    var settings = collectSettingsFromGui();
    var defaultName = lastSettingsFileName.replace(".txt", "");
    var folder = Folder(settingsFolderPath);
    if (!folder.exists) folder.create();
    // var oldFolder = Folder.current;
    // Folder.current = folder;
    var file = File.saveDialog("Save settings as...", defaultName + ".txt", "*.txt", folder);
    // Folder.current = oldFolder;
    if (!file) return;
    file.open("w");
    for (var k in settings)
        if (settings.hasOwnProperty(k)) file.writeln(k + ": " + settings[k]);
    file.close();
    alert("Settings saved!", "TimeSlicerPro");
}


// === [ LOGGING ] ===
function log(msg) {
    if (DEBUG_MODE) $.writeln("[LOG] " + msg);
}

// === [ SETTINGS SAVE/LOAD ] ===
// Save settings to "TSP-LastSettingsUsed.txt" (auto-load/auto-save)
function saveLastSettingsAuto() {
    var settings = collectSettingsFromGui();
    var folder = Folder(settingsFolderPath);
    if (!folder.exists) folder.create();
    var file = new File(LAST_SETTINGS_PATH);
    file.open("w");
    for (var k in settings) {
        if (settings.hasOwnProperty(k)) file.writeln(k + ": " + settings[k]);
    }
    file.close();
}

// Suggest settings file name (timestamp + pattern)
function getSettingsFilenameSuggested() {
    var d = new Date();
    function p(n) { return (n < 10 ? '0' : '') + n; }
    var timestamp = d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
    var pattern = ddPattern && ddPattern.selection ? ddPattern.selection.text.replace(/[^a-z0-9]/gi, "_").toLowerCase() : "pattern";
    return timestamp + "_" + pattern + ".txt";
}

// Collect all GUI field values for saving
function collectSettingsFromGui() {
    return {
		 outputType: (typeof ddOutputType !== "undefined" && ddOutputType.selection) ? ddOutputType.selection.text : "",
        outputPattern: (typeof ddPattern !== "undefined" && ddPattern.selection) ? ddPattern.selection.text : "",
        // Pattern and directories
        patternIndex: ddPattern && ddPattern.selection ? ddPattern.selection.index : 0,
        sourceDir: (typeof txtSourceDir !== "undefined" && txtSourceDir.text) ? txtSourceDir.text : "",
        destDir: (typeof txtDestDir !== "undefined" && txtDestDir.text) ? txtDestDir.text : "",

        // Classic params
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

        // Shadow settings
        chkShadow: (typeof chkShadowEnable !== "undefined" && chkShadowEnable.value) ? chkShadowEnable.value : false,
        txtShadowR: (typeof txtShadowR !== "undefined" && txtShadowR.text) ? txtShadowR.text : "0",
        txtShadowG: (typeof txtShadowG !== "undefined" && txtShadowG.text) ? txtShadowG.text : "0",
        txtShadowB: (typeof txtShadowB !== "undefined" && txtShadowB.text) ? txtShadowB.text : "0",
        txtShadowOpacity: (typeof txtShadowOpacity !== "undefined" && txtShadowOpacity.text) ? txtShadowOpacity.text : "80",
        txtShadowDistance: (typeof txtShadowDistance !== "undefined" && txtShadowDistance.text) ? txtShadowDistance.text : "8",
        txtShadowBlur: (typeof txtShadowBlur !== "undefined" && txtShadowBlur.text) ? txtShadowBlur.text : "10"
    };
}

// Apply settings to GUI fields e aggiorna variabili globali
function applySettingsToGui(settings) {
    if (ddPattern && settings.patternIndex != null) ddPattern.selection = parseInt(settings.patternIndex, 10);

    // Aggiorna SOURCE_DIR
    if (txtSourceDir && settings.sourceDir) {
        txtSourceDir.text = settings.sourceDir;
        SOURCE_DIR = new Folder(settings.sourceDir);
        if (SOURCE_DIR.exists) {
            var files = SOURCE_DIR.getFiles(function(f) {
                return f instanceof File && f.name.match(/\.(jpe?g|png|tif?f|bmp)$/i);
            });
            IMG_COUNT = files.length;
            if (lblImgCount) lblImgCount.text = IMG_COUNT + "";
        } else {
            IMG_COUNT = 0;
            if (lblImgCount) lblImgCount.text = "0";
        }
    }

    // Aggiorna DEST_DIR
    if (txtDestDir && settings.destDir) {
        txtDestDir.text = settings.destDir;
        DEST_DIR = new Folder(settings.destDir);
    }

    if (txtClassicHorizontalSlices && settings.txtClassicHorizontalSlices) txtClassicHorizontalSlices.text = settings.txtClassicHorizontalSlices;
    if (txtClassicVerticalSlices && settings.txtClassicVerticalSlices) txtClassicVerticalSlices.text = settings.txtClassicVerticalSlices;
    if (txtClassicDiagonalSlices && settings.txtClassicDiagonalSlices) txtClassicDiagonalSlices.text = settings.txtClassicDiagonalSlices;
    if (txtClassicTriangleSlices && settings.txtClassicTriangleSlices) txtClassicTriangleSlices.text = settings.txtClassicTriangleSlices;

    if (txtRadialSectors && settings.txtRadialSectors) txtRadialSectors.text = settings.txtRadialSectors;
    if (txtSpiralBands && settings.txtSpiralBands) txtSpiralBands.text = settings.txtSpiralBands;
    if (txtSpiralAngle && settings.txtSpiralAngle) txtSpiralAngle.text = settings.txtSpiralAngle;
    if (txtOvalCount && settings.txtOvalCount) txtOvalCount.text = settings.txtOvalCount;

    if (txtPuzzleRows && settings.txtPuzzleRows) txtPuzzleRows.text = settings.txtPuzzleRows;
    if (txtPuzzleCols && settings.txtPuzzleCols) txtPuzzleCols.text = settings.txtPuzzleCols;
    if (chkPuzzleOutline && typeof settings.chkPuzzleOutline !== "undefined") chkPuzzleOutline.value = (settings.chkPuzzleOutline === true || settings.chkPuzzleOutline === "true");

    if (txtPuzzleStripCount && settings.txtPuzzleStripCount) txtPuzzleStripCount.text = settings.txtPuzzleStripCount;
    if (ddPuzzleStripOrientation && typeof settings.ddPuzzleStripOrientation !== "undefined") ddPuzzleStripOrientation.selection = parseInt(settings.ddPuzzleStripOrientation, 10);
    if (chkPuzzle1DOutline && typeof settings.chkPuzzle1DOutline !== "undefined") chkPuzzle1DOutline.value = (settings.chkPuzzle1DOutline === true || settings.chkPuzzle1DOutline === "true");

    if (txtChessboardRows && settings.txtChessboardRows) txtChessboardRows.text = settings.txtChessboardRows;
    if (txtChessboardCols && settings.txtChessboardCols) txtChessboardCols.text = settings.txtChessboardCols;

    if (chkShowPreview && typeof settings.chkShowPreview !== "undefined") chkShowPreview.value = (settings.chkShowPreview === true || settings.chkShowPreview === "true");
    if (chkKeepPreview && typeof settings.chkKeepPreview !== "undefined") chkKeepPreview.value = (settings.chkKeepPreview === true || settings.chkKeepPreview === "true");
    if (chkLogging && typeof settings.chkLogging !== "undefined") chkLogging.value = (settings.chkLogging === true || settings.chkLogging === "true");

    if (chkShadowEnable && typeof settings.chkShadow !== "undefined") chkShadowEnable.value = (settings.chkShadow === true || settings.chkShadow === "true");
    if (txtShadowR && typeof settings.txtShadowR !== "undefined") txtShadowR.text = settings.txtShadowR;
    if (txtShadowG && typeof settings.txtShadowG !== "undefined") txtShadowG.text = settings.txtShadowG;
    if (txtShadowB && typeof settings.txtShadowB !== "undefined") txtShadowB.text = settings.txtShadowB;
    if (txtShadowOpacity && typeof settings.txtShadowOpacity !== "undefined") txtShadowOpacity.text = settings.txtShadowOpacity;
    if (txtShadowDistance && typeof settings.txtShadowDistance !== "undefined") txtShadowDistance.text = settings.txtShadowDistance;
    if (txtShadowBlur && typeof settings.txtShadowBlur !== "undefined") txtShadowBlur.text = settings.txtShadowBlur;
}


// PATCH: Carica settings all’avvio (dopo creazione GUI)
var settings = null;
if (File(LAST_SETTINGS_PATH).exists) {
    settings = loadSettingsObject();
} else {
    settings = getDefaults();
}

// ====================================================================
// === BLOCCO 2 – GUI principale, parametri pattern, directory, shadow, preview, logging ===
// ====================================================================

// === [ MAIN DIALOG WINDOW ] ===
var myWin = new Window("dialog", SCRIPT_NAME + " " + SCRIPT_VERSION);
myWin.onClose = function() {
    saveLastSettingsAuto();
};

// --- [ INFO GROUP: TITLE + ABOUT ] ---
var gTitle = myWin.add("group");
gTitle.orientation = "row";
var lblTitle = gTitle.add("statictext", undefined, SCRIPT_NAME + " " + SCRIPT_VERSION + "   ©CapZicco 2025");
lblTitle.justify = "left";
lblTitle.characters = 35;
var btnAbout = gTitle.add("button", undefined, "About");
// === [ DEFAULTS ] ===
function getDefaults() {
    return {
        sourceDir: "",
        destDir: "",
        txtOutputFile: "output",
        outputType: "jpg",
        outputPattern: "Classic Vertical Slices Left To Right",
        txtOutputQuality: "12",
        txtClassicVerticalSlices: "10",  // Solo questo serve per il tuo pattern default
        chkShowPreview: true,
        chkKeepPreview: false,
        chkLogging: true,
        chkShadow: false,
        txtShadowR: "0",
        txtShadowG: "0",
        txtShadowB: "0",
        txtShadowOpacity: "80",
        txtShadowDistance: "8",
        txtShadowBlur: "10"
    };
}
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
var ddPattern = gPattern.add("dropdownlist", undefined, [
    "Horizontal (Top to Bottom)",
    "Horizontal (Bottom to Top)",
    "Vertical (Left to Right)",
    "Vertical (Right to Left)",
    "Diagonal (Main)",
    "Diagonal (Anti)",
    "Chessboard",
    "HexGrid",
    "Oval",
    "Puzzle (2D)",
    "Puzzle Strip (1D)",
    "Radial",
    "Spiral",
    "Sunbeam",
    "Wave"
]);
ddPattern.selection = 0; // Default: Horizontal (Top to Bottom)

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
// === [ OUTPUT FILE PANEL ] ===
var gOutput = myWin.add("panel", undefined, "Output File");
gOutput.orientation = "row";
gOutput.alignChildren = "center";

gOutput.add("statictext", undefined, "Type:");
var ddOutputType = gOutput.add("dropdownlist", undefined, ["JPG", "PNG", "TIFF"]);
ddOutputType.selection = 0;

gOutput.add("statictext", undefined, "Quality:");
var txtOutputQuality = gOutput.add("edittext", undefined, "12");
txtOutputQuality.characters = 2;

gOutput.add("statictext", undefined, "File name:");
var txtOutputFile = gOutput.add("edittext", undefined, "");
txtOutputFile.characters = 36;
txtOutputFile.enabled = false;

function updateSuggestedFilename() {
    var ext = ddOutputType.selection.text.toLowerCase();
    var patternStr = ddPattern.selection.text;
    var now = new Date();
    function pad(n) { return n < 10 ? '0' + n : n; }
    var timestamp = now.getFullYear() + "-" +
        pad(now.getMonth() + 1) + "-" +
        pad(now.getDate()) + "_" +
        pad(now.getHours()) + "-" +
        pad(now.getMinutes()) + "-" +
        pad(now.getSeconds());
    var cleanPattern = patternStr.toUpperCase().replace(/\s+/g, "_");
    var fname = "TSP-result_" + SCRIPT_VERSION + "_" + timestamp + "_" + cleanPattern + "." + ext;
    if (txtOutputFile) txtOutputFile.text = fname;
}

var chkShowPreview = gOptions.add("checkbox", undefined, "Show Preview"); chkShowPreview.value = true;
var chkKeepPreview = gOptions.add("checkbox", undefined, "Keep Preview"); chkKeepPreview.value = false;
var chkLogging = gOptions.add("checkbox", undefined, "Enable Logging"); chkLogging.value = DEBUG_MODE;
gOptions.add("statictext", undefined, " ");
var btnLoadSettings = gOptions.add("button", undefined, "Load");
var btnSaveSettings = gOptions.add("button", undefined, "Save");
var btnResetSettings = gOptions.add("button", undefined, "Reset");
btnSaveSettings.onClick = saveSettingsSnapshot;
btnLoadSettings.onClick = function() {
    var loaded = loadSettingsWithPicker();
    if (loaded) applySettingsToGui(loaded);
};


// --- SAVE SETTINGS: suggerisce nome e salva come .txt ---
btnLoadSettings.onClick = function() {
    var loaded = loadSettingsWithPicker();
    if (loaded) applySettingsToGui(loaded);
};
btnResetSettings.onClick = function() {
    var def = getDefaults();
    applySettingsToGui(def);
    lblImgCount.text = "0";
    SOURCE_DIR = null; DEST_DIR = null; IMG_COUNT = 0;
    updateParamGroups();
    log("Settings reset to defaults.");
};

// === [ ACTION BUTTONS: RUN, CANCEL, HELP ] ===
var gActions = myWin.add("group");
gActions.orientation = "row";
var btnRun = gActions.add("button", undefined, "Time Slice");
var btnCancel = gActions.add("button", undefined, "Quit");


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
    // Aggiungi qui, se vuoi, updateSuggestedFilename();
	   updateSuggestedFilename();
}
ddPattern.onChange = updateParamGroups;
updateParamGroups(); // Avvia con pattern default visibile

// === [ DIRECTORY SELECTION ] ===
btnSelectSourceDir.onClick = function() {
    var d = Folder.selectDialog("Select source image folder");
    if (!d) return;
    SOURCE_DIR = d;
    txtSourceDir.text = SOURCE_DIR.fsName;
    var files = SOURCE_DIR.getFiles(function(f) { return f instanceof File && f.name.match(/\.(jpe?g|png|tif?f|bmp)$/i); });
    IMG_COUNT = files.length;
    lblImgCount.text = IMG_COUNT + "";
    log("Source directory set: " + SOURCE_DIR.fsName + " (" + IMG_COUNT + " images)");

    // PATCH: AUTO-SET SLICES
    if (typeof txtClassicHorizontalSlices !== "undefined") txtClassicHorizontalSlices.text = IMG_COUNT;
    if (typeof txtClassicVerticalSlices !== "undefined") txtClassicVerticalSlices.text = IMG_COUNT;
    if (typeof txtClassicDiagonalSlices !== "undefined") txtClassicDiagonalSlices.text = IMG_COUNT;
    if (typeof txtClassicTriangleSlices !== "undefined") txtClassicTriangleSlices.text = IMG_COUNT;
    if (typeof txtRadialSectors !== "undefined") txtRadialSectors.text = IMG_COUNT;
    if (typeof txtSpiralBands !== "undefined") txtSpiralBands.text = IMG_COUNT;
    if (typeof txtOvalCount !== "undefined") txtOvalCount.text = IMG_COUNT;
};

btnSelectDestDir.onClick = function() {
    var d = Folder.selectDialog("Select destination folder");
    if (!d) return;
    DEST_DIR = d;
    txtDestDir.text = DEST_DIR.fsName;
    log("Destination directory set: " + DEST_DIR.fsName);
};



btnLoadSettings.onClick = function() {
    var loaded = loadSettingsWithPicker();
    if (loaded) applySettingsToGui(loaded);
};

btnResetSettings.onClick = function() {
    var def = getDefaults();
    applySettingsToGui(def);
    lblImgCount.text = "0";
    SOURCE_DIR = null; DEST_DIR = null; IMG_COUNT = 0;
    updateParamGroups();
    log("Settings reset to defaults.");
};

// PATCH: Applica settings caricati all’avvio (solo dopo creazione GUI)
if (settings) applySettingsToGui(settings);


// === [ SHOW PREVIEW BUTTON ] ===
chkShowPreview.onClick = function() {
    if (chkShowPreview.value) {
        showPatternPreview();
    } else {
        removePreviewMask();
    }
};

// === [ HELP/ABOUT ] ===
btnAbout.onClick = function() {
    alert(
        "TimeSlicerPro v26.03\n\n" +
        "Main Dev: CapZicco\n" +
        "Modular code & doc: Copilot (2025)\n\n" +
        "https://github.com/CapZicco/TimeSlicerPro\n\n" +
        "100% settings compatibility with v26.\n" +
        "This script is open & extendable. Patch/fork/feedback welcome!\n",
        "About"
    );
};

// === [ FINE BLOCCO 2 ] ===
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

// --- ProgressWindow class ---
function ProgressWindow(totalSteps) {
    if (isNaN(totalSteps) || totalSteps < 1) totalSteps = 1;

    this.win = new Window("palette", "TimeSlicerPro Progress", undefined, {closeButton: false});
    this.win.orientation = "column";
    this.label = this.win.add("statictext", undefined, "1 di " + totalSteps);
    this.progress = this.win.add("progressbar", undefined, 0, totalSteps);
    this.progress.preferredSize = [300, 20];

    // Bottone Stop
    this.btnStop = this.win.add("button", undefined, "Stop");
    this.userCancelled = false;
    var self = this;
    this.btnStop.onClick = function() {
        self.userCancelled = true;
    };

    this.win.show();

    // Posizionamento a destra in basso
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
// === [ SHADOW: AGGIUNGI OMBRA A UN LAYER ] ===
function addShadowToLayer(layer) {
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

// --- [ FILE UTILS ] ---
function fileExist(f) {
    try {
        if (!f) return false;
        return File(f).exists;
    } catch (e) { return false; }
}


function closeFile(fileRef, mode) {
    try {
        switch (mode) {
            case "save": fileRef.close(SaveOptions.SAVECHANGES); break;
            case "nosave": fileRef.close(SaveOptions.DONOTSAVECHANGES); break;
            case "prompt":
            default: fileRef.close(SaveOptions.PROMPTTOSAVECHANGES); break;
        }
    } catch (e) { /* ignore */ }
}

function duplicateLayersInto(targetDoc) {
    try {
        for (var z = app.activeDocument.artLayers.length - 1; z >= 0; z--) {
            var al = app.activeDocument.artLayers[z];
            al.duplicate(targetDoc, ElementPlacement.PLACEATEND);
        }
    } catch (e) { log("duplicateLayersInto error: " + e.message); }
}


// --- [ RESULT SAVE UTILS ] ---
function getResultFilename(patternStr, ext) {
    var now = new Date();
    function pad(n) { return n < 10 ? '0' + n : n; }
    var timestamp = now.getFullYear() + "-" +
        pad(now.getMonth() + 1) + "-" +
        pad(now.getDate()) + "_" +
        pad(now.getHours()) + "-" +
        pad(now.getMinutes()) + "-" +
        pad(now.getSeconds());
    var cleanPattern = patternStr.toUpperCase().replace(/\s+/g, "_");
    return "TSP-result_v26.00_" + timestamp + "_" + cleanPattern + "." + ext;
}

function saveResultDoc(resultDoc, destFolder, patternStr, ext, quality) {
    var fileName = getResultFilename(patternStr, ext);
    var saveFile = new File(destFolder.fsName + "/" + fileName);

    if (ext.toLowerCase() === "jpg" || ext.toLowerCase() === "jpeg") {
        var jpgOpts = new JPEGSaveOptions();
        jpgOpts.quality = quality || 12;
        resultDoc.saveAs(saveFile, jpgOpts, true, Extension.LOWERCASE);
    } else if (ext.toLowerCase() === "png") {
        var pngOpts = new PNGSaveOptions();
        resultDoc.saveAs(saveFile, pngOpts, true, Extension.LOWERCASE);
    } else if (ext.toLowerCase() === "tif" || ext.toLowerCase() === "tiff") {
        var tifOpts = new TiffSaveOptions();
        resultDoc.saveAs(saveFile, tifOpts, true, Extension.LOWERCASE);
    }
    // altri formati se vuoi...
    return saveFile.fsName;
}
// --- [ SELECTION UTILS ] ---
function cTID(s) { return app.charIDToTypeID(s); }
function sTID(s) { return app.stringIDToTypeID(s); }

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
// === [ BATCH & FILE HELPERS ] ===
function getSourceFiles() {
    if (!SOURCE_DIR) return [];
    return SOURCE_DIR.getFiles(function(f) { return f instanceof File && f.name.match(/\.(jpe?g|png|tif?f|bmp)$/i); });
}
function getDestFolder() {
    if (!DEST_DIR) return null;
    return DEST_DIR;
}

// --- [ PREVIEW FUNZIONI (dummy, sicuri, nessun errore) ] ---
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

// === Routine controllo ESC ===

function confirmSpecialExit() {
    var w = new Window("dialog", "Rendering Interrupted");
    w.orientation = "column";
    w.add("statictext", undefined, "Rendering interrupted by user.");
    var group = w.add("group");
    var btnExit = group.add("button", undefined, "Exit");
    var btnMenu = group.add("button", undefined, "Back to Menu");
    var btnContinue = group.add("button", undefined, "Continue");
    var result = null;
    btnExit.onClick = function() { result = "exit"; w.close(); };
    btnMenu.onClick = function() { result = "menu"; w.close(); };
    btnContinue.onClick = function() { result = "continue"; w.close(); };
    w.show();
    return result;
}

function openFile(fileWithPath) {
    if (fileExist(fileWithPath)) {
        var thisFile = File(fileWithPath);
        return app.open(thisFile);
    } else {
        alert(fileWithPath, "404 File Not Found", true);
        return false;
    }
}

// === [ RUN – Classic Horizontal ] ===

function runHorizontalSlices(files, settings, direction, progressWin) {
    TSP_USER_INTERRUPT = false;
    var numSlices = files.length;
    var baseFile = openFile(files[0].path + "/" + files[0].name);
    if (!baseFile) return null;
    var newFile = baseFile.duplicate();
    var w = newFile.width.value || parseInt(newFile.width);
    var h = newFile.height.value || parseInt(newFile.height);
    closeFile(baseFile, "nosave");

    for (var i = 0; i < numSlices; i++) {
        if (progressWin && progressWin.userCancelled) { TSP_USER_INTERRUPT = true; break; }
        if (TSP_USER_INTERRUPT) break;
        try {
            if (progressWin) progressWin.update(i + 1);
            var sliceIdx = (direction === "BottomToTop") ? (numSlices - 1 - i) : i;
            var processingFile = openFile(files[sliceIdx].path + "/" + files[sliceIdx].name);
            if (!processingFile) continue;
            duplicateLayersInto(newFile);
            closeFile(processingFile, "nosave");
            newFile.activeLayer.name = files[sliceIdx].name.replace(/\.[^.]+$/, "");

            var y1 = h * (i / numSlices);
            var y2 = h * ((i + 1) / numSlices);
            selectRect(0, y1, w, y2);
            maskSelection();
            addShadowToLayer(newFile.activeLayer);
            newFile.mergeVisibleLayers();
            app.activeDocument = newFile;
            app.refresh();
        } catch (e) {
            if (e.number && (e.number & 0xFFFF) === 8007) {
                TSP_USER_INTERRUPT = true;
                break;
            } else throw e;
        }
    }
    return TSP_USER_INTERRUPT ? null : newFile;
}

// === [ RUN – Classic Vertical ] ===

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
        var baseDoc = openFile(files[0].fsName);
        if (!baseDoc) {
            alert("Could not open base image.");
            return;
        }
        var newDoc = baseDoc.duplicate();
        var w = newDoc.width.as ? newDoc.width.as("px") : parseInt(newDoc.width);
        var h = newDoc.height.as ? newDoc.height.as("px") : parseInt(newDoc.height);
        closeFile(baseDoc, "nosave");
        var progressWin = new ProgressWindow(numSlices);

        for (var i = 0; i < numSlices; i++) {
            // PATCH: controllo ESC/interruzione utente come runClassicHorizontal
            if (progressWin.userCancelled) {
                var choice = confirmSpecialExit();
                if (choice === "exit") {
                    progressWin.close();
                    return;
                }
                if (choice === "menu") {
                    progressWin.close();
                    return;
                }
                // se "continue", semplicemente riprendi il ciclo
            }

            if (progressWin) progressWin.update(i + 1, numSlices);

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

// === [ RUN: Placeholder per tutti gli altri pattern ] ===

function runDiagonalSlices()      { alert("Diagonal Main: qui la funzione reale!"); }
Function runDiagonalSlices()      { alert("Diagonal Anti: qui la funzione reale!"); }
function runTriangle() 		      { alert("Triangle: qui la funzione reale!"); }
function runChessboard()          { alert("Chessboard: qui la funzione reale!"); }
function runHexGrid()             { alert("HexGrid: qui la funzione reale!"); }
function runOval()                { alert("Oval: qui la funzione reale!"); }
function runPuzzle2D()            { alert("Puzzle2D: qui la funzione reale!"); }
function runPuzzle1D()            { alert("Puzzle1D: qui la funzione reale!"); }
function runRadial()              { alert("Radial: qui la funzione reale!"); }
function runSpiral()              { alert("Spiral: qui la funzione reale!"); }
function runSunbeam()             { alert("Sunbeam: qui la funzione reale!"); }
function runWave()                { alert("Wave: qui la funzione reale!"); }

// === [ DISPATCHER RUN BUTTON: chiama la funzione corretta ] ===
btnRun.onClick = function() {
    try {
        // PATCH: controllo immagini PRIMA di tutto
        var files = getSourceFiles();
        if (!files || files.length === 0) {
            alert("Nessuna immagine trovata nella cartella di origine!\nSeleziona una cartella valida prima di procedere.");
            return;
        }

        saveLastSettingsAuto(); // PATCH: auto-save settings
        log("---- RUN START ----");
        var pattern = ddPattern.selection.text;
        removePreviewMask();

        // RESET flag ESC all'inizio di ogni run!
        if (typeof TSP_USER_INTERRUPT === "undefined") TSP_USER_INTERRUPT = false;
        TSP_USER_INTERRUPT = false;

        // --- Qui puoi mettere, se vuoi, la progressWin globale ---
        var progressWin = null;

        switch (pattern) {
            case "Horizontal (Top to Bottom)":
                runHorizontalSlices(files, collectSettingsFromGui(), "TopToBottom", new ProgressWindow(files.length));
                break;
            case "Horizontal (Bottom to Top)":
                runHorizontalSlices(files, collectSettingsFromGui(), "BottomToTop", new ProgressWindow(files.length));
                break;
            case "Vertical (Left to Right)":
                runVerticalSlices(files, collectSettingsFromGui(), "LeftToRight", new ProgressWindow(files.length));
                break;
            case "Vertical (Right to Left)":
                runVerticalSlices(files, collectSettingsFromGui(), "RightToLeft", new ProgressWindow(files.length));
                break;
            case "Diagonal (Main)":
                runDiagonalSlices(files, collectSettingsFromGui(), "Main", new ProgressWindow(files.length));
                break;
            case "Diagonal (Anti)":
                runDiagonalSlices(files, collectSettingsFromGui(), "Anti", new ProgressWindow(files.length));
                break;
            case "Chessboard":
                runChessboard(files, collectSettingsFromGui(), new ProgressWindow(files.length));
                break;
            case "HexGrid":
                runHexGrid(files, collectSettingsFromGui(), new ProgressWindow(files.length));
                break;
            case "Oval":
                runOval(files, collectSettingsFromGui(), new ProgressWindow(files.length));
                break;
            case "Puzzle (2D)":
                runPuzzle2D(files, collectSettingsFromGui(), new ProgressWindow(files.length));
                break;
            case "Puzzle Strip (1D)":
                runPuzzle1D(files, collectSettingsFromGui(), new ProgressWindow(files.length));
                break;
            case "Radial":
                runRadial(files, collectSettingsFromGui(), new ProgressWindow(files.length));
                break;
            case "Spiral":
                runSpiral(files, collectSettingsFromGui(), new ProgressWindow(files.length));
                break;
            case "Sunbeam":
                runSunbeam(files, collectSettingsFromGui(), new ProgressWindow(files.length));
                break;
            case "Wave":
                runWave(files, collectSettingsFromGui(), new ProgressWindow(files.length));
                break;
            default:
                alert("Pattern not recognized: " + pattern);
        }

        // --- PATCH: Centralizza chiusura progressWin qui, se serve ---
        if (typeof progressWin !== "undefined" && progressWin) progressWin.close();

        // --- PATCH: Centralizza la gestione ESC/STOP qui ---
        if (typeof TSP_USER_INTERRUPT !== "undefined" && TSP_USER_INTERRUPT) {
            var choice = confirmSpecialExit();
            if (choice === "exit") {
                while (app.documents.length) app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
                return;
            }
            if (choice === "menu") {
                return;
            }
            if (choice === "continue") {
                TSP_USER_INTERRUPT = false;
                // Qui puoi rilanciare la funzione di slicing o far ripartire la run, se vuoi
            }
        }

        log("---- RUN END ----");
    } catch (err) {
        log("ERROR: " + err.message);
        alert("Error: " + err.message);
    }
};

// === [ CANCEL BUTTON: chiude tutto ] ===
btnCancel.onClick = function() {
    // Chiedi se chiudere tutte le immagini prima di uscire
    closeAllDocs("Do you want to close all images already open in Photoshop before you quit?");
    // Chiudi la finestra principale
    myWin.close();
};
// === [ FINE: MOSTRA LA FINESTRA ] ===
myWin.onClose = function() {
    var settings = collectSettingsFromGui();
    saveLastSettingsAuto();
    return true;
};

// === [ SAVE SNAPSHOT: Salva settings come TSP_YYYY-MM-DD_HH-MM-SS_Pattern.txt ] ===
function saveSettingsSnapshot() {
    var settings = collectSettingsFromGui();
    var now = new Date();
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    var timestamp = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate()) + "_" +
                    pad(now.getHours()) + "-" + pad(now.getMinutes()) + "-" + pad(now.getSeconds());
    var pattern = (ddPattern && ddPattern.selection) ? ddPattern.selection.text.replace(/[^a-z0-9]/gi, "_") : "Pattern";
    var folder = Folder(settingsFolderPath);
    if (!folder.exists) folder.create();
    var file = new File(folder.fsName + "/TSP_" + timestamp + "_" + pattern + ".txt");
    file.open("w");
    for (var k in settings) if (settings.hasOwnProperty(k)) file.writeln(k + ": " + settings[k]);
    file.close();
    alert("Settings saved as:\n" + file.fsName, "TimeSlicerPro");
}
// Chiedi prima di tutto:
closeAllDocs("Do you want to close all images already open in Photoshop before you start?");

myWin.center();
myWin.show();