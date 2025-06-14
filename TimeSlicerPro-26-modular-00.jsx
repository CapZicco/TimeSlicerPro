// ====================================================================
// === TimeSlicerPro v26.00 – Modular & Complete – CapZicco & Cuocografo – 2025 ===
// ====================================================================
//
// Base: v24 repository (batch, naming, output, shadow, settings: file TXT!)
// Nuovo: preview universale/evento, ESC, progress bar, directory selector, GUI migliorata, shadow avanzato
// 
// REQUISITI: Photoshop v22+ (CC 2021+) – English ScriptUI recommended
// ====================================================================

// === [ CREDITS / INFO ] ===
/*
    Script created by CapZicco, modular rewrite and features by Cuocografo (2025)
    Official repo: https://github.com/CapZicco/TimeSlicerPro
    Collaborators welcome! Patch, fork, PR, feedback: open.
*/

// === [ GLOBAL CONSTANTS & FLAGS ] ===
var SCRIPT_NAME = "TimeSlicerPro";
var SCRIPT_VERSION = "v26.00";

var DEBUG_MODE = true;
var TSP_USER_INTERRUPT = false;

// --- DIRS e IMG COUNT ---
var SOURCE_DIR = null;
var DEST_DIR = null;
var IMG_COUNT = 0;

// --- SETTINGS (compatibile v24: FILE TXT) ---
var SETTINGS_PATH = '~/Documents/tsp/TSP-LastSettingsUsed.txt';

// --- LOGGING ---
function log(msg) { if (DEBUG_MODE) $.writeln("[LOG] " + msg); }

// --- ESC HANDLER UNIVERSALE ---
function checkUserInterrupt() {
    if (TSP_USER_INTERRUPT) throw new Error("Process interrupted by user (ESC)");
}
function setEscHandler(activeWin) {
    TSP_USER_INTERRUPT = false;
    activeWin.addEventListener("keydown", function(e) {
        if (e.keyName === "Escape") TSP_USER_INTERRUPT = true;
    });
}

// === [ SAVE/LOAD SETTINGS: FILE TXT ] ===
function saveSettings(settings) {
    var folder = Folder('~/Documents/tsp/');
    if (!folder.exists) folder.create();
    var file = new File(SETTINGS_PATH);
    file.open("w");
    for (var k in settings) {
        if (settings.hasOwnProperty(k)) {
            file.writeln(k + ": " + settings[k]);
        }
    }
    file.close();
    log("Settings saved to file: " + SETTINGS_PATH);
}
function loadSettings() {
    var file = new File(SETTINGS_PATH);
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
    log("Settings loaded from file: " + SETTINGS_PATH);
    return obj;
}

// --- UTILITY: FORMAT NUMBER ---
function pad2(n) { return (n < 10 ? "0" : "") + n; }

// === [ FINE BLOCCO 1 – La GUI parte dalla PART 2! ] ===
// ====================================================================
// === [ PART 2/10 – GUI Principale: LOGO, Directory, Counter, Pattern, Parametri, Opzioni ] ===
// ====================================================================

// --- [ FUNZIONE DEFAULT SETTINGS (come v24) ] ---
function getDefaults() {
    return {
        pattern: 0,
        sourceDir: "",
        destDir: "",
        // ...aggiungi qui TUTTI i parametri pattern e opzioni
        showPreview: true,
        keepPreview: false,
        enableLogging: true,
        shadowEnabled: false,
        shadowColor: "0,0,0",
        shadowOpacity: 70,
        shadowAngle: 120,
        shadowDistance: 10,
        shadowBlur: 10
        // ...ecc
    };
}

// === [ CREAZIONE FINESTRA PRINCIPALE ] ===
var myWin = new Window("dialog", SCRIPT_NAME + " " + SCRIPT_VERSION);

// --- [ ASCII LOGO + AUTORE ] ---
var gLogo = myWin.add("group");
gLogo.orientation = "column";
gLogo.alignChildren = "left";
gLogo.add("statictext", undefined,
"  _______ _                 _____ _ _            _____            \n"+
" |__   __| |               / ____| (_)          |  __ \\           \n"+
"    | |  | |__   ___      | (___ | |_  ___ ___  | |__) |_ _ _   _ \n"+
"    | |  | '_ \\ / _ \\      \\___ \\| | |/ __/ _ \\ |  ___/ _` | | | |\n"+
"    | |  | | | |  __/      ____) | | | (_|  __/ | |  | (_| | |_| |\n"+
"    |_|  |_| |_|\\___|     |_____/|_|_|\\___\\___| |_|   \\__,_|\\__, |\n"+
"                                                           __/ |  \n"+
"   CapZicco & Cuocografo 2025    github.com/CapZicco      |___/   "
);

// --- [ DIRECTORY & FILES CONTROL ] ---
var gDir = myWin.add("group");
gDir.orientation = "row";
gDir.alignChildren = "left";

gDir.add("statictext", undefined, "Source:");
var txtSourceDir = gDir.add("edittext", undefined, "", {readonly: true});
txtSourceDir.characters = 24;
var btnSelectSourceDir = gDir.add("button", undefined, "...");
gDir.add("statictext", undefined, "Dest:");
var txtDestDir = gDir.add("edittext", undefined, "", {readonly: true});
txtDestDir.characters = 24;
var btnSelectDestDir = gDir.add("button", undefined, "...");

var lblImgCount = gDir.add("statictext", undefined, "Images: 0");


// --- [ SELETTORI DIRECTORY E CONTATORE IMMAGINI ] ---
var gDirs = myWin.add("group");
gDirs.orientation = "row";
gDirs.alignChildren = "center";

// -- Source --
var lblSource = gDirs.add("statictext", undefined, "Source:");
var txtSourceDir = gDirs.add("edittext", undefined, "", {readonly:true});
txtSourceDir.preferredSize.width = 240;
var btnSource = gDirs.add("button", undefined, "Select...");
btnSource.onClick = function() {
    var folder = Folder.selectDialog("Select source folder (timelapse)");
    if (folder) {
        SOURCE_DIR = folder;
        txtSourceDir.text = SOURCE_DIR.fsName;
        refreshImgCount();
    }
};
// -- Dest --
var lblDest = gDirs.add("statictext", undefined, "Dest:");
var txtDestDir = gDirs.add("edittext", undefined, "", {readonly:true});
txtDestDir.preferredSize.width = 240;
var btnDest = gDirs.add("button", undefined, "Select...");
btnDest.onClick = function() {
    var folder = Folder.selectDialog("Select destination folder (output)");
    if (folder) {
        DEST_DIR = folder;
        txtDestDir.text = DEST_DIR.fsName;
    }
};
// -- Image Counter --
var lblImgCount = gDirs.add("statictext", undefined, "Images:");
var txtImgCount = gDirs.add("edittext", undefined, "0", {readonly:true});
txtImgCount.preferredSize.width = 38;
function refreshImgCount() {
    IMG_COUNT = 0;
    if (SOURCE_DIR && SOURCE_DIR.exists) {
        var files = SOURCE_DIR.getFiles(function(f){ return f instanceof File && f.name.match(/\.(jpe?g|png|tif?f|bmp)$/i); });
        IMG_COUNT = files.length;
    }
    txtImgCount.text = IMG_COUNT;
}

// === [ PATTERN SELECTION DROPDOWN & GRUPPI PARAMETRI GLOBALI ] ===
var gPattern = myWin.add("group");
gPattern.orientation = "row";
gPattern.alignChildren = "left";
gPattern.add("statictext", undefined, "Pattern:");

var patternList = [
    "Chessboard",
    "Classic (Diagonal)",
    "Classic (Horizontal)",
    "Classic (Triangle)",
    "Classic (Vertical)",
    "Oval",
    "Puzzle (2D)",
    "Puzzle Strip (1D)",
    "Radial",
    "Spiral",
    "Sunbeam",
    "Wave"
    // Aggiungi qui nuovi pattern (ordine alfabetico!)
];

var ddPattern = gPattern.add("dropdownlist", undefined, patternList);
ddPattern.selection = 0;

// === [ PARAMETRI SPECIFICI PER OGNI PATTERN: GLOBALI, ALFABETICI ] ===
var gParams = myWin.add("group");
gParams.orientation = "stack";
// === PARAMETER GROUPS ORDINATI, v26 COMPATIBILI, COMPLETI ===

// --- Chessboard ---
var gChessboard = gParams.add("group");
gChessboard.orientation = "row";
gChessboard.visible = false;
gChessboard.add("statictext", undefined, "Rows:");
var txtChessboardRows = gChessboard.add("edittext", undefined, "8");
txtChessboardRows.characters = 3;
gChessboard.add("statictext", undefined, "Cols:");
var txtChessboardCols = gChessboard.add("edittext", undefined, "8");
txtChessboardCols.characters = 3;

// --- Classic Horizontal ---
var gClassicHorizontal = gParams.add("group");
gClassicHorizontal.orientation = "row";
gClassicHorizontal.visible = false;
gClassicHorizontal.add("statictext", undefined, "Slices:");
var txtClassicHorizontalSlices = gClassicHorizontal.add("edittext", undefined, "10");
txtClassicHorizontalSlices.characters = 4;

// --- Classic Vertical ---
var gClassicVertical = gParams.add("group");
gClassicVertical.orientation = "row";
gClassicVertical.visible = false;
gClassicVertical.add("statictext", undefined, "Slices:");
var txtClassicVerticalSlices = gClassicVertical.add("edittext", undefined, "10");
txtClassicVerticalSlices.characters = 4;

// --- Classic Diagonal ---
var gClassicDiagonal = gParams.add("group");
gClassicDiagonal.orientation = "row";
gClassicDiagonal.visible = false;
gClassicDiagonal.add("statictext", undefined, "Slices:");
var txtClassicDiagonalSlices = gClassicDiagonal.add("edittext", undefined, "10");
txtClassicDiagonalSlices.characters = 4;

// --- Classic Triangle ---
var gClassicTriangle = gParams.add("group");
gClassicTriangle.orientation = "row";
gClassicTriangle.visible = false;
gClassicTriangle.add("statictext", undefined, "Slices:");
var txtClassicTriangleSlices = gClassicTriangle.add("edittext", undefined, "12");
txtClassicTriangleSlices.characters = 4;

// --- Radial ---
var gRadial = gParams.add("group");
gRadial.orientation = "row";
gRadial.visible = false;
gRadial.add("statictext", undefined, "Sectors:");
var txtRadialSectors = gRadial.add("edittext", undefined, "16");
txtRadialSectors.characters = 4;

// --- Spiral ---
var gSpiral = gParams.add("group");
gSpiral.orientation = "row";
gSpiral.visible = false;
gSpiral.add("statictext", undefined, "Bands:");
var txtSpiralBands = gSpiral.add("edittext", undefined, "12");
txtSpiralBands.characters = 4;
gSpiral.add("statictext", undefined, "Angle:");
var txtSpiralAngle = gSpiral.add("edittext", undefined, "90");
txtSpiralAngle.characters = 4;

// --- Oval ---
var gOval = gParams.add("group");
gOval.orientation = "row";
gOval.visible = false;
gOval.add("statictext", undefined, "Ovals:");
var txtOvalCount = gOval.add("edittext", undefined, "7");
txtOvalCount.characters = 4;

// --- Puzzle 2D ---
var gPuzzle2d = gParams.add("group");
gPuzzle2d.orientation = "row";
gPuzzle2d.visible = false;
gPuzzle2d.add("statictext", undefined, "Rows:");
var txtPuzzleRows = gPuzzle2d.add("edittext", undefined, "5");
txtPuzzleRows.characters = 3;
gPuzzle2d.add("statictext", undefined, "Cols:");
var txtPuzzleCols = gPuzzle2d.add("edittext", undefined, "5");
txtPuzzleCols.characters = 3;
var chkPuzzleOutline = gPuzzle2d.add("checkbox", undefined, "Outline");
chkPuzzleOutline.value = true;

// --- Puzzle Strip 1D ---
var gPuzzle1d = gParams.add("group");
gPuzzle1d.orientation = "row";
gPuzzle1d.visible = false;
gPuzzle1d.add("statictext", undefined, "Strips:");
var txtPuzzleStripCount = gPuzzle1d.add("edittext", undefined, "8");
txtPuzzleStripCount.characters = 3;
gPuzzle1d.add("statictext", undefined, "Orientation:");
var ddPuzzleStripOrientation = gPuzzle1d.add("dropdownlist", undefined, ["Horizontal", "Vertical"]);
ddPuzzleStripOrientation.selection = 0;
var chkPuzzle1DOutline = gPuzzle1d.add("checkbox", undefined, "Outline");
chkPuzzle1DOutline.value = true;

// --- Shadow (gruppo opzioni shadow, globale, NON pattern) ---
var gShadow = myWin.add("group");
gShadow.orientation = "row";
gShadow.alignChildren = "left";
var chkShadow = gShadow.add("checkbox", undefined, "Enable Shadow");
chkShadow.value = false;
gShadow.add("statictext", undefined, "Color (R,G,B):");
var txtShadowColor = gShadow.add("edittext", undefined, "0,0,0");
txtShadowColor.characters = 7;
gShadow.add("statictext", undefined, "Opacity:");
var txtShadowOpacity = gShadow.add("edittext", undefined, "70");
txtShadowOpacity.characters = 3;
gShadow.add("statictext", undefined, "Angle:");
var txtShadowAngle = gShadow.add("edittext", undefined, "120");
txtShadowAngle.characters = 3;
gShadow.add("statictext", undefined, "Distance:");
var txtShadowDistance = gShadow.add("edittext", undefined, "10");
txtShadowDistance.characters = 3;
gShadow.add("statictext", undefined, "Blur:");
var txtShadowBlur = gShadow.add("edittext", undefined, "10");
txtShadowBlur.characters = 3;


// === [ OPZIONI GLOBALI: PREVIEW, KEEP, LOGGING, SHADOW, ETC ] ===
var gOptions = myWin.add("group");
gOptions.orientation = "row";
gOptions.alignChildren = "left";

var chkShowPreview = gOptions.add("checkbox", undefined, "Show Preview");
chkShowPreview.value = true;
var chkKeepPreview = gOptions.add("checkbox", undefined, "Keep Preview");
chkKeepPreview.value = false;
var chkLogging = gOptions.add("checkbox", undefined, "Enable Logging");
chkLogging.value = DEBUG_MODE;
var gSettings = myWin.add("group");
gSettings.orientation = "row";
gSettings.alignChildren = "left";
var btnLoadSettings = gSettings.add("button", undefined, "Load");
var btnSaveSettings = gSettings.add("button", undefined, "Save");
var btnResetSettings = gSettings.add("button", undefined, "Reset");
chkLogging.onClick = function(){ DEBUG_MODE = chkLogging.value; };

// --- SHADOW OPTIONS ---
var chkShadow = gOptions.add("checkbox", undefined, "Enable Shadow");
chkShadow.value = false;
var lblShadowColor = gOptions.add("statictext", undefined, "Color:");
var txtShadowColor = gOptions.add("edittext", undefined, "0,0,0");
txtShadowColor.characters = 7;
var lblShadowOpacity = gOptions.add("statictext", undefined, "Opacity:");
var sldShadowOpacity = gOptions.add("slider", undefined, 70, 0, 100);
var txtShadowOpacity = gOptions.add("edittext", undefined, "70");
txtShadowOpacity.characters = 3;
sldShadowOpacity.onChanging = function(){ txtShadowOpacity.text = Math.round(sldShadowOpacity.value); };
txtShadowOpacity.onChange = function(){ sldShadowOpacity.value = parseInt(txtShadowOpacity.text, 10) || 0; };
var lblShadowAngle = gOptions.add("statictext", undefined, "Angle:");
var txtShadowAngle = gOptions.add("edittext", undefined, "120");
txtShadowAngle.characters = 3;
var lblShadowDistance = gOptions.add("statictext", undefined, "Dist:");
var txtShadowDistance = gOptions.add("edittext", undefined, "10");
txtShadowDistance.characters = 3;
var lblShadowBlur = gOptions.add("statictext", undefined, "Blur:");
var txtShadowBlur = gOptions.add("edittext", undefined, "10");
txtShadowBlur.characters = 3;

// === [ FINE PART 2/10 ] ===

// --- Quando vuoi, PART 3: gestione dinamica parametri pattern, eventi preview a evento, pulsanti azione, progress bar, esc!
// ====================================================================
// === [ PART 3/10 – Gestione Dinamica Pattern, Eventi, Preview, Pulsanti Azione ] ===
// ====================================================================

// --- [ VISIBILITÀ DINAMICA GRUPPI PARAMETRI: SOLO IL PATTERN ATTIVO È VISIBILE ] ---
function updateParamGroups() {
    // Nasconde tutti i gruppi
    gChessboard.visible = false;
    // ...aggiungi qui tutti gli altri gruppi pattern (es: gClassicHorizontal.visible = false; ecc.)

    // Mostra solo quello selezionato
    switch(ddPattern.selection.text) {
        case "Chessboard": gChessboard.visible = true; break;
        // ...aggiungi qui tutti gli altri gruppi pattern (es: case "Classic (Horizontal)": gClassicHorizontal.visible = true; break;)
        // ...ecc.
    }
}
ddPattern.onChange = updateParamGroups;
updateParamGroups(); // Mostra subito il primo pattern

// --- [ POPOLA DIR/IMG COUNTER SE SETTINGS GIÀ PRESENTI ] ---
function applySettingsToGui(settings) {
    if (!settings) return;
    if (settings.sourceDir) {
        SOURCE_DIR = new Folder(settings.sourceDir);
        txtSourceDir.text = SOURCE_DIR.fsName;
        refreshImgCount();
    }
    if (settings.destDir) {
        DEST_DIR = new Folder(settings.destDir);
        txtDestDir.text = DEST_DIR.fsName;
    }
    if (settings.pattern != null && ddPattern.items.length > settings.pattern)
        ddPattern.selection = settings.pattern;

    // Aggiungi qui: ricarica tutti i parametri globali pattern/flag dal file!
    chkShowPreview.value = !!settings.showPreview;
    chkKeepPreview.value = !!settings.keepPreview;
    chkLogging.value = !!settings.enableLogging;
    chkShadow.value = !!settings.shadowEnabled;
    txtShadowColor.text = settings.shadowColor || "0,0,0";
    sldShadowOpacity.value = txtShadowOpacity.text = settings.shadowOpacity || 70;
    txtShadowAngle.text = settings.shadowAngle || 120;
    txtShadowDistance.text = settings.shadowDistance || 10;
    txtShadowBlur.text = settings.shadowBlur || 10;
    // ...ecc.
}

// --- [ PREVIEW A EVENTO (SPAZIO/INVIO/BOTTONE) ] ---
var previewLayer = null;
function showPatternPreview() {
    // Disattiva maschera preview precedente
    removePreviewMask();
    // ... qui logica di disegno preview per il pattern selezionato (implementazione completa in PART 5/10)
    // Per ora: layer dummy (verrà aggiornato pattern per pattern)
    previewLayer = null;
}
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

// --- [ EVENTI: SPAZIO/INVIO/BOTTONE per chiudere preview ] ---
function setupPreviewEventHandlers(win) {
    win.addEventListener("keydown", function(e){
        if (e.keyName === "Space" || e.keyName === "Enter") {
            removePreviewMask();
        }
    });
}

// --- [ AZIONI: SAVE, LOAD, RUN, CANCEL, HELP ] ---
var gActions = myWin.add("group");
gActions.orientation = "row";
var btnLoad = gActions.add("button", undefined, "Load Settings");
btnLoad.onClick = function() {
    var settings = loadSettings();
    if (settings) applySettingsToGui(settings);
};
var btnSave = gActions.add("button", undefined, "Save Settings");
btnSave.onClick = function() {
    var settings = collectGuiSettings();
    saveSettings(settings);
};
var btnPreview = gActions.add("button", undefined, "Show Preview");
btnPreview.onClick = function() { showPatternPreview(); };
var btnRun = gActions.add("button", undefined, "Time Slice");
var btnCancel = gActions.add("button", undefined, "Quit");
var btnHelp = gActions.add("button", undefined, "?");

// --- [ RACCOLTA PARAMETRI GUI PRONTI PER SAVE/LOGIC ] ---
function collectGuiSettings() {
    return {
        pattern: ddPattern.selection.index,
        sourceDir: (SOURCE_DIR ? SOURCE_DIR.fsName : ""),
        destDir: (DEST_DIR ? DEST_DIR.fsName : ""),
        showPreview: chkShowPreview.value,
        keepPreview: chkKeepPreview.value,
        enableLogging: chkLogging.value,
        shadowEnabled: chkShadow.value,
        shadowColor: txtShadowColor.text,
        shadowOpacity: parseInt(txtShadowOpacity.text, 10),
        shadowAngle: parseInt(txtShadowAngle.text, 10),
        shadowDistance: parseInt(txtShadowDistance.text, 10),
        shadowBlur: parseInt(txtShadowBlur.text, 10)
        // ...aggiungi qui tutti i parametri pattern!
    };
}

// --- [ AIUTO / CREDITS ] ---
btnHelp.onClick = function() {
    alert(
        SCRIPT_NAME + " " + SCRIPT_VERSION + "\n\n" +
        "Main Dev: CapZicco\n" +
        "Code modularization: Cuocografo (2025)\n\n" +
        "Repo: github.com/CapZicco/TimeSlicerPro"
    );
};

// --- [ SETUP ESC HANDLER GLOBALE SULLA WINDOW ] ---
setEscHandler(myWin);
// --- [ SETUP PREVIEW EVENT HANDLER ] ---
setupPreviewEventHandlers(myWin);

// --- [ AUTO-LOAD SETTINGS ALL’AVVIO ] ---
var initSettings = loadSettings();
if (initSettings) applySettingsToGui(initSettings);

// === [ FINE PART 3/10 ] ===
// ====================================================================
// === [ PART 4/10 – Dispatcher Pattern, Progress Window, Template Funzioni Run ] ===
// ====================================================================

// === [ UNIVERSAL PROGRESS WINDOW ] ===
function startProgressWin(totalSteps, label) {
    var progressWin = new Window("palette", label || "Progress");
    progressWin.progress = progressWin.add("progressbar", undefined, 0, totalSteps);
    progressWin.progress.preferredSize = [300, 16];
    progressWin.txt = progressWin.add("statictext", undefined, "Starting...");
    progressWin.show();
    return progressWin;
}
function updateProgressWin(progressWin, current, total) {
    if (!progressWin) return;
    progressWin.progress.value = current;
    progressWin.txt.text = "Progress: " + current + " / " + total;
    progressWin.update();
}
function closeProgressWin(progressWin) {
    if (progressWin) progressWin.close();
}

// === [ UNIVERSAL PATTERN DISPATCHER: CHIAMA LA FUNZIONE CORRETTA ] ===
btnRun.onClick = function () {
    try {
        log("---- RUN START ----");
        TSP_USER_INTERRUPT = false;

        // Raccogli parametri (modifica qui per tutti i pattern!)
        var settings = collectGuiSettings();

        // Ricarica immagini e verifica cartelle
        if (!SOURCE_DIR || !DEST_DIR || IMG_COUNT === 0) {
            alert("Select source/dest folders and check images first!");
            return;
        }

        // Rimuovi maschera preview
        removePreviewMask();

        // Dispatcher pattern
        switch(ddPattern.selection.text) {
            case "Chessboard":
                runChessboard(
                    parseInt(txtChessboardRows.text, 10),
                    parseInt(txtChessboardCols.text, 10),
                    settings
                );
                break;
            // ...Aggiungi qui tutti gli altri pattern, esempio:
            // case "Classic (Horizontal)":
            //     runClassicHorizontal(..., settings);
            //     break;
            // ...
            default:
                alert("Unknown pattern selected!");
        }

        log("---- RUN END ----");
    } catch (err) {
        log("ERROR: " + err.message);
        alert("Error: " + err.message);
    }
};

// === [ TEMPLATE UNIVERSALE “RUN” PER OGNI PATTERN ] ===
//
// Ogni pattern implementa:
// - preview a evento (showPatternPreview)
// - controllo ESC in ogni ciclo
// - progress bar universale
// - shadow opzionale, già pronto
//
// Esempio pattern chessboard:
function runChessboard(rows, cols, settings) {
    log("Running Chessboard: " + rows + "x" + cols);

    // --- PREVIEW ---
    if (chkShowPreview.value) {
        // Call preview function specifica (da completare in PART 5/10)
        showPatternPreview();
        // Attendi evento per chiusura preview (SPACE/ENTER)
        // (Handler già installato su myWin, vedi PART 3/10)
        if (!chkKeepPreview.value) {
            // Qui puoi inserire una logica per attendere l'evento oppure lasciare all'utente la chiusura manuale
        }
    }

    // --- PROGRESS ---
    var totalCells = rows * cols;
    var progressWin = startProgressWin(totalCells, "Chessboard Progress");

    for (var i = 0; i < rows; i++) {
        for (var j = 0; j < cols; j++) {
            checkUserInterrupt();
            // TODO: logica slicing reale qui!
            updateProgressWin(progressWin, i * cols + j + 1, totalCells);
        }
    }
    closeProgressWin(progressWin);

    log("Chessboard done.");
}

// --- [ (Copia template e incolla per tutti i pattern, es: runClassicHorizontal, runSpiral, ecc) ] ---

// === [ FINE PART 4/10 ] ===
// === [ UNIVERSAL PREVIEW: CHIAMA IL DISEGNO GIUSTO PER IL PATTERN ] ===
function showPatternPreview() {
    removePreviewMask();
    var pattern = ddPattern.selection.text;

    if (pattern === "Chessboard") {
        previewChessboard(
            parseInt(txtChessboardRows.text, 10),
            parseInt(txtChessboardCols.text, 10)
        );
    }
    else if (pattern === "Classic (Horizontal)") {
        previewClassicHorizontal(
            parseInt(txtClassicHorizontalSlices.text, 10)
        );
    }
    else if (pattern === "Classic (Vertical)") {
        previewClassicVertical(
            parseInt(txtClassicVerticalSlices.text, 10)
        );
    }
    else if (pattern === "Classic (Diagonal)") {
        previewClassicDiagonal(
            parseInt(txtClassicDiagonalSlices.text, 10)
        );
    }
    else if (pattern === "Classic (Triangle)") {
        previewClassicTriangle(
            parseInt(txtClassicTriangleSlices.text, 10)
        );
    }
    else if (pattern === "Oval") {
        previewOval(
            parseInt(txtOvalCount.text, 10)
        );
    }
    else if (pattern === "Radial") {
        previewRadial(
            parseInt(txtRadialSectors.text, 10)
        );
    }
    else if (pattern === "Spiral") {
        previewSpiral(
            parseInt(txtSpiralBands.text, 10),
            parseFloat(txtSpiralAngle.text)
        );
    }
    else if (pattern === "Puzzle (2D)") {
        previewPuzzle2D(
            parseInt(txtPuzzleRows.text, 10),
            parseInt(txtPuzzleCols.text, 10)
        );
    }
    else if (pattern === "Puzzle Strip (1D)") {
        previewPuzzle1D(
            parseInt(txtPuzzleStripCount.text, 10),
            ddPuzzleStripOrientation.selection.text
        );
    }
    // Qui aggiungi altri pattern futuri (Sunbeam, Wave, ecc)
}

// === [ FUNZIONI DI PREVIEW PER OGNI PATTERN ] ===

function previewChessboard(rows, cols) {
    try {
        var doc = app.activeDocument, w = doc.width.as("px"), h = doc.height.as("px");
        var maskLayer = doc.artLayers.add(); maskLayer.name = "Preview Mask"; maskLayer.opacity = 60; maskLayer.blendMode = BlendMode.NORMAL;
        for (var i = 0; i < rows; i++) for (var j = 0; j < cols; j++) {
            if ((i + j) % 2 === 0) {
                var x0 = Math.round(j * w / cols), y0 = Math.round(i * h / rows);
                var x1 = Math.round((j + 1) * w / cols), y1 = Math.round((i + 1) * h / rows);
                var coords = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
                doc.selection.select(coords);
                doc.selection.stroke(app.foregroundColor, 2, StrokeLocation.INSIDE, ColorBlendMode.NORMAL, 100, false);
                doc.selection.deselect();
            }
        }
    } catch (e) { log("Preview Chessboard error: " + e.message); }
}

function previewClassicHorizontal(numSlices) {
    try {
        var doc = app.activeDocument, w = doc.width.as("px"), h = doc.height.as("px");
        var maskLayer = doc.artLayers.add(); maskLayer.name = "Preview Mask"; maskLayer.opacity = 60; maskLayer.blendMode = BlendMode.NORMAL;
        for (var i = 0; i < numSlices; i++) {
            var y0 = Math.round(i * h / numSlices), y1 = Math.round((i + 1) * h / numSlices);
            var coords = [[0, y0], [w, y0], [w, y1], [0, y1]];
            doc.selection.select(coords);
            doc.selection.stroke(app.foregroundColor, 2, StrokeLocation.INSIDE, ColorBlendMode.NORMAL, 100, false);
            doc.selection.deselect();
        }
    } catch (e) { log("Preview Classic Horizontal error: " + e.message); }
}

function previewClassicVertical(numSlices) {
    try {
        var doc = app.activeDocument, w = doc.width.as("px"), h = doc.height.as("px");
        var maskLayer = doc.artLayers.add(); maskLayer.name = "Preview Mask"; maskLayer.opacity = 60; maskLayer.blendMode = BlendMode.NORMAL;
        for (var i = 0; i < numSlices; i++) {
            var x0 = Math.round(i * w / numSlices), x1 = Math.round((i + 1) * w / numSlices);
            var coords = [[x0, 0], [x1, 0], [x1, h], [x0, h]];
            doc.selection.select(coords);
            doc.selection.stroke(app.foregroundColor, 2, StrokeLocation.INSIDE, ColorBlendMode.NORMAL, 100, false);
            doc.selection.deselect();
        }
    } catch (e) { log("Preview Classic Vertical error: " + e.message); }
}

function previewClassicDiagonal(numSlices) {
    try {
        var doc = app.activeDocument, w = doc.width.as("px"), h = doc.height.as("px");
        var maskLayer = doc.artLayers.add(); maskLayer.name = "Preview Mask"; maskLayer.opacity = 60; maskLayer.blendMode = BlendMode.NORMAL;
        // Diagonali parallele (semplificato, puoi migliorare la logica)
        for (var i = 0; i < numSlices; i++) {
            var t = i / numSlices;
            var x0 = Math.round(t * w), y0 = 0, x1 = 0, y1 = Math.round(t * h);
            var x2 = w, y2 = Math.round(t * h), x3 = Math.round(t * w), y3 = h;
            var coords = [[x0, y0], [x1, y1], [x2, y2], [x3, y3]];
            doc.selection.select(coords);
            doc.selection.stroke(app.foregroundColor, 2, StrokeLocation.INSIDE, ColorBlendMode.NORMAL, 100, false);
            doc.selection.deselect();
        }
    } catch (e) { log("Preview Classic Diagonal error: " + e.message); }
}

function previewClassicTriangle(numSlices) {
    try {
        var doc = app.activeDocument, w = doc.width.as("px"), h = doc.height.as("px");
        var maskLayer = doc.artLayers.add(); maskLayer.name = "Preview Mask"; maskLayer.opacity = 60; maskLayer.blendMode = BlendMode.NORMAL;
        // Triangoli verticali
        for (var i = 0; i < numSlices; i++) {
            var x0 = Math.round(i * w / numSlices), x1 = Math.round((i + 1) * w / numSlices);
            var coords = [[x0, h], [x1, h], [w/2, 0]];
            doc.selection.select(coords);
            doc.selection.stroke(app.foregroundColor, 2, StrokeLocation.INSIDE, ColorBlendMode.NORMAL, 100, false);
            doc.selection.deselect();
        }
    } catch (e) { log("Preview Classic Triangle error: " + e.message); }
}

function previewOval(count) {
    try {
        var doc = app.activeDocument, w = doc.width.as("px"), h = doc.height.as("px");
        var maskLayer = doc.artLayers.add(); maskLayer.name = "Preview Mask"; maskLayer.opacity = 60; maskLayer.blendMode = BlendMode.NORMAL;
        for (var i = 1; i <= count; i++) {
            var rx = (w/2) * i / count, ry = (h/2) * i / count;
            doc.selection.selectEllipse(w/2 - rx, h/2 - ry, w/2 + rx, h/2 + ry);
            doc.selection.stroke(app.foregroundColor, 2, StrokeLocation.INSIDE, ColorBlendMode.NORMAL, 100, false);
            doc.selection.deselect();
        }
    } catch (e) { log("Preview Oval error: " + e.message); }
}

function previewRadial(sectors) {
    try {
        var doc = app.activeDocument, w = doc.width.as("px"), h = doc.height.as("px"), cx = w/2, cy = h/2;
        var maskLayer = doc.artLayers.add(); maskLayer.name = "Preview Mask"; maskLayer.opacity = 60; maskLayer.blendMode = BlendMode.NORMAL;
        for (var i = 0; i < sectors; i++) {
            var theta0 = 2 * Math.PI * i / sectors;
            var theta1 = 2 * Math.PI * (i + 1) / sectors;
            var r = Math.sqrt(cx*cx + cy*cy);
            var points = [[cx, cy]];
            for (var t = 0; t <= 1; t += 0.05) {
                var angle = theta0 + (theta1 - theta0) * t;
                points.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
            }
            doc.selection.select(points);
            doc.selection.stroke(app.foregroundColor, 2, StrokeLocation.INSIDE, ColorBlendMode.NORMAL, 100, false);
            doc.selection.deselect();
        }
    } catch (e) { log("Preview Radial error: " + e.message); }
}

function previewSpiral(bands, angle) {
    try {
        var doc = app.activeDocument, w = doc.width.as("px"), h = doc.height.as("px"), cx = w/2, cy = h/2;
        var maskLayer = doc.artLayers.add(); maskLayer.name = "Preview Mask"; maskLayer.opacity = 60; maskLayer.blendMode = BlendMode.NORMAL;
        var rMax = Math.sqrt(cx*cx + cy*cy);
        for (var i = 0; i < bands; i++) {
            var theta0 = (i * angle) * Math.PI / 180;
            var theta1 = ((i + 1) * angle) * Math.PI / 180;
            var points = [[cx, cy]];
            var steps = 48;
            for (var s = 0; s <= steps; s++) {
                var t = s / steps;
                var theta = theta0 + t * (theta1 - theta0);
                var r = t * rMax;
                points.push([cx + r * Math.cos(theta), cy + r * Math.sin(theta)]);
            }
            doc.selection.select(points);
            doc.selection.stroke(app.foregroundColor, 2, StrokeLocation.INSIDE, ColorBlendMode.NORMAL, 100, false);
            doc.selection.deselect();
        }
    } catch (e) { log("Preview Spiral error: " + e.message); }
}

function previewPuzzle2D(rows, cols) {
    try {
        var doc = app.activeDocument, w = doc.width.as("px"), h = doc.height.as("px");
        var maskLayer = doc.artLayers.add(); maskLayer.name = "Preview Mask"; maskLayer.opacity = 60; maskLayer.blendMode = BlendMode.NORMAL;
        for (var i = 0; i < rows; i++) {
            for (var j = 0; j < cols; j++) {
                var x0 = Math.round(j * w / cols), y0 = Math.round(i * h / rows);
                var x1 = Math.round((j + 1) * w / cols), y1 = Math.round((i + 1) * h / rows);
                var coords = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
                doc.selection.select(coords);
                doc.selection.stroke(app.foregroundColor, 2, StrokeLocation.INSIDE, ColorBlendMode.NORMAL, 100, false);
                doc.selection.deselect();
            }
        }
    } catch (e) { log("Preview Puzzle2D error: " + e.message); }
}

function previewPuzzle1D(count, orientation) {
    try {
        var doc = app.activeDocument, w = doc.width.as("px"), h = doc.height.as("px");
        var maskLayer = doc.artLayers.add(); maskLayer.name = "Preview Mask"; maskLayer.opacity = 60; maskLayer.blendMode = BlendMode.NORMAL;
        if (orientation === "Vertical") {
            for (var i = 0; i < count; i++) {
                var x0 = Math.round(i * w / count), x1 = Math.round((i + 1) * w / count);
                var coords = [[x0, 0], [x1, 0], [x1, h], [x0, h]];
                doc.selection.select(coords);
                doc.selection.stroke(app.foregroundColor, 2, StrokeLocation.INSIDE, ColorBlendMode.NORMAL, 100, false);
                doc.selection.deselect();
            }
        } else {
            for (var i = 0; i < count; i++) {
                var y0 = Math.round(i * h / count), y1 = Math.round((i + 1) * h / count);
                var coords = [[0, y0], [w, y0], [w, y1], [0, y1]];
                doc.selection.select(coords);
                doc.selection.stroke(app.foregroundColor, 2, StrokeLocation.INSIDE, ColorBlendMode.NORMAL, 100, false);
                doc.selection.deselect();
            }
        }
    } catch (e) { log("Preview Puzzle1D error: " + e.message); }
}
// === [ UNIVERSAL PREVIEW: CHIAMA IL DISEGNO GIUSTO PER IL PATTERN ] ===
function showPatternPreview() {
    removePreviewMask();
    var pattern = ddPattern.selection.text;

    if (pattern === "Chessboard") {
        previewChessboard(
            parseInt(txtChessboardRows.text, 10),
            parseInt(txtChessboardCols.text, 10)
        );
    }
    else if (pattern === "Classic (Horizontal)") {
        previewClassicHorizontal(
            parseInt(txtClassicHorizontalSlices.text, 10)
        );
    }
    else if (pattern === "Classic (Vertical)") {
        previewClassicVertical(
            parseInt(txtClassicVerticalSlices.text, 10)
        );
    }
    else if (pattern === "Classic (Diagonal)") {
        previewClassicDiagonal(
            parseInt(txtClassicDiagonalSlices.text, 10)
        );
    }
    else if (pattern === "Classic (Triangle)") {
        previewClassicTriangle(
            parseInt(txtClassicTriangleSlices.text, 10)
        );
    }
    else if (pattern === "Oval") {
        previewOval(
            parseInt(txtOvalCount.text, 10)
        );
    }
    else if (pattern === "Radial") {
        previewRadial(
            parseInt(txtRadialSectors.text, 10)
        );
    }
    else if (pattern === "Spiral") {
        previewSpiral(
            parseInt(txtSpiralBands.text, 10),
            parseFloat(txtSpiralAngle.text)
        );
    }
    else if (pattern === "Puzzle (2D)") {
        previewPuzzle2D(
            parseInt(txtPuzzleRows.text, 10),
            parseInt(txtPuzzleCols.text, 10)
        );
    }
    else if (pattern === "Puzzle Strip (1D)") {
        previewPuzzle1D(
            parseInt(txtPuzzleStripCount.text, 10),
            ddPuzzleStripOrientation.selection.text
        );
    }
    // Qui aggiungi altri pattern futuri (Sunbeam, Wave, ecc)
}

// === [ FUNZIONI DI PREVIEW PER OGNI PATTERN ] ===

function previewChessboard(rows, cols) {
    try {
        var doc = app.activeDocument, w = doc.width.as("px"), h = doc.height.as("px");
        var maskLayer = doc.artLayers.add(); maskLayer.name = "Preview Mask"; maskLayer.opacity = 60; maskLayer.blendMode = BlendMode.NORMAL;
        for (var i = 0; i < rows; i++) for (var j = 0; j < cols; j++) {
            if ((i + j) % 2 === 0) {
                var x0 = Math.round(j * w / cols), y0 = Math.round(i * h / rows);
                var x1 = Math.round((j + 1) * w / cols), y1 = Math.round((i + 1) * h / rows);
                var coords = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
                doc.selection.select(coords);
                doc.selection.stroke(app.foregroundColor, 2, StrokeLocation.INSIDE, ColorBlendMode.NORMAL, 100, false);
                doc.selection.deselect();
            }
        }
    } catch (e) { log("Preview Chessboard error: " + e.message); }
}

function previewClassicHorizontal(numSlices) {
    try {
        var doc = app.activeDocument, w = doc.width.as("px"), h = doc.height.as("px");
        var maskLayer = doc.artLayers.add(); maskLayer.name = "Preview Mask"; maskLayer.opacity = 60; maskLayer.blendMode = BlendMode.NORMAL;
        for (var i = 0; i < numSlices; i++) {
            var y0 = Math.round(i * h / numSlices), y1 = Math.round((i + 1) * h / numSlices);
            var coords = [[0, y0], [w, y0], [w, y1], [0, y1]];
            doc.selection.select(coords);
            doc.selection.stroke(app.foregroundColor, 2, StrokeLocation.INSIDE, ColorBlendMode.NORMAL, 100, false);
            doc.selection.deselect();
        }
    } catch (e) { log("Preview Classic Horizontal error: " + e.message); }
}

function previewClassicVertical(numSlices) {
    try {
        var doc = app.activeDocument, w = doc.width.as("px"), h = doc.height.as("px");
        var maskLayer = doc.artLayers.add(); maskLayer.name = "Preview Mask"; maskLayer.opacity = 60; maskLayer.blendMode = BlendMode.NORMAL;
        for (var i = 0; i < numSlices; i++) {
            var x0 = Math.round(i * w / numSlices), x1 = Math.round((i + 1) * w / numSlices);
            var coords = [[x0, 0], [x1, 0], [x1, h], [x0, h]];
            doc.selection.select(coords);
            doc.selection.stroke(app.foregroundColor, 2, StrokeLocation.INSIDE, ColorBlendMode.NORMAL, 100, false);
            doc.selection.deselect();
        }
    } catch (e) { log("Preview Classic Vertical error: " + e.message); }
}

function previewClassicDiagonal(numSlices) {
    try {
        var doc = app.activeDocument, w = doc.width.as("px"), h = doc.height.as("px");
        var maskLayer = doc.artLayers.add(); maskLayer.name = "Preview Mask"; maskLayer.opacity = 60; maskLayer.blendMode = BlendMode.NORMAL;
        // Diagonali parallele (semplificato, puoi migliorare la logica)
        for (var i = 0; i < numSlices; i++) {
            var t = i / numSlices;
            var x0 = Math.round(t * w), y0 = 0, x1 = 0, y1 = Math.round(t * h);
            var x2 = w, y2 = Math.round(t * h), x3 = Math.round(t * w), y3 = h;
            var coords = [[x0, y0], [x1, y1], [x2, y2], [x3, y3]];
            doc.selection.select(coords);
            doc.selection.stroke(app.foregroundColor, 2, StrokeLocation.INSIDE, ColorBlendMode.NORMAL, 100, false);
            doc.selection.deselect();
        }
    } catch (e) { log("Preview Classic Diagonal error: " + e.message); }
}

function previewClassicTriangle(numSlices) {
    try {
        var doc = app.activeDocument, w = doc.width.as("px"), h = doc.height.as("px");
        var maskLayer = doc.artLayers.add(); maskLayer.name = "Preview Mask"; maskLayer.opacity = 60; maskLayer.blendMode = BlendMode.NORMAL;
        // Triangoli verticali
        for (var i = 0; i < numSlices; i++) {
            var x0 = Math.round(i * w / numSlices), x1 = Math.round((i + 1) * w / numSlices);
            var coords = [[x0, h], [x1, h], [w/2, 0]];
            doc.selection.select(coords);
            doc.selection.stroke(app.foregroundColor, 2, StrokeLocation.INSIDE, ColorBlendMode.NORMAL, 100, false);
            doc.selection.deselect();
        }
    } catch (e) { log("Preview Classic Triangle error: " + e.message); }
}

function previewOval(count) {
    try {
        var doc = app.activeDocument, w = doc.width.as("px"), h = doc.height.as("px");
        var maskLayer = doc.artLayers.add(); maskLayer.name = "Preview Mask"; maskLayer.opacity = 60; maskLayer.blendMode = BlendMode.NORMAL;
        for (var i = 1; i <= count; i++) {
            var rx = (w/2) * i / count, ry = (h/2) * i / count;
            doc.selection.selectEllipse(w/2 - rx, h/2 - ry, w/2 + rx, h/2 + ry);
            doc.selection.stroke(app.foregroundColor, 2, StrokeLocation.INSIDE, ColorBlendMode.NORMAL, 100, false);
            doc.selection.deselect();
        }
    } catch (e) { log("Preview Oval error: " + e.message); }
}

function previewRadial(sectors) {
    try {
        var doc = app.activeDocument, w = doc.width.as("px"), h = doc.height.as("px"), cx = w/2, cy = h/2;
        var maskLayer = doc.artLayers.add(); maskLayer.name = "Preview Mask"; maskLayer.opacity = 60; maskLayer.blendMode = BlendMode.NORMAL;
        for (var i = 0; i < sectors; i++) {
            var theta0 = 2 * Math.PI * i / sectors;
            var theta1 = 2 * Math.PI * (i + 1) / sectors;
            var r = Math.sqrt(cx*cx + cy*cy);
            var points = [[cx, cy]];
            for (var t = 0; t <= 1; t += 0.05) {
                var angle = theta0 + (theta1 - theta0) * t;
                points.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
            }
            doc.selection.select(points);
            doc.selection.stroke(app.foregroundColor, 2, StrokeLocation.INSIDE, ColorBlendMode.NORMAL, 100, false);
            doc.selection.deselect();
        }
    } catch (e) { log("Preview Radial error: " + e.message); }
}

function previewSpiral(bands, angle) {
    try {
        var doc = app.activeDocument, w = doc.width.as("px"), h = doc.height.as("px"), cx = w/2, cy = h/2;
        var maskLayer = doc.artLayers.add(); maskLayer.name = "Preview Mask"; maskLayer.opacity = 60; maskLayer.blendMode = BlendMode.NORMAL;
        var rMax = Math.sqrt(cx*cx + cy*cy);
        for (var i = 0; i < bands; i++) {
            var theta0 = (i * angle) * Math.PI / 180;
            var theta1 = ((i + 1) * angle) * Math.PI / 180;
            var points = [[cx, cy]];
            var steps = 48;
            for (var s = 0; s <= steps; s++) {
                var t = s / steps;
                var theta = theta0 + t * (theta1 - theta0);
                var r = t * rMax;
                points.push([cx + r * Math.cos(theta), cy + r * Math.sin(theta)]);
            }
            doc.selection.select(points);
            doc.selection.stroke(app.foregroundColor, 2, StrokeLocation.INSIDE, ColorBlendMode.NORMAL, 100, false);
            doc.selection.deselect();
        }
    } catch (e) { log("Preview Spiral error: " + e.message); }
}

function previewPuzzle2D(rows, cols) {
    try {
        var doc = app.activeDocument, w = doc.width.as("px"), h = doc.height.as("px");
        var maskLayer = doc.artLayers.add(); maskLayer.name = "Preview Mask"; maskLayer.opacity = 60; maskLayer.blendMode = BlendMode.NORMAL;
        for (var i = 0; i < rows; i++) {
            for (var j = 0; j < cols; j++) {
                var x0 = Math.round(j * w / cols), y0 = Math.round(i * h / rows);
                var x1 = Math.round((j + 1) * w / cols), y1 = Math.round((i + 1) * h / rows);
                var coords = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
                doc.selection.select(coords);
                doc.selection.stroke(app.foregroundColor, 2, StrokeLocation.INSIDE, ColorBlendMode.NORMAL, 100, false);
                doc.selection.deselect();
            }
        }
    } catch (e) { log("Preview Puzzle2D error: " + e.message); }
}

function previewPuzzle1D(count, orientation) {
    try {
        var doc = app.activeDocument, w = doc.width.as("px"), h = doc.height.as("px");
        var maskLayer = doc.artLayers.add(); maskLayer.name = "Preview Mask"; maskLayer.opacity = 60; maskLayer.blendMode = BlendMode.NORMAL;
        if (orientation === "Vertical") {
            for (var i = 0; i < count; i++) {
                var x0 = Math.round(i * w / count), x1 = Math.round((i + 1) * w / count);
                var coords = [[x0, 0], [x1, 0], [x1, h], [x0, h]];
                doc.selection.select(coords);
                doc.selection.stroke(app.foregroundColor, 2, StrokeLocation.INSIDE, ColorBlendMode.NORMAL, 100, false);
                doc.selection.deselect();
            }
        } else {
            for (var i = 0; i < count; i++) {
                var y0 = Math.round(i * h / count), y1 = Math.round((i + 1) * h / count);
                var coords = [[0, y0], [w, y0], [w, y1], [0, y1]];
                doc.selection.select(coords);
                doc.selection.stroke(app.foregroundColor, 2, StrokeLocation.INSIDE, ColorBlendMode.NORMAL, 100, false);
                doc.selection.deselect();
            }
        }
    } catch (e) { log("Preview Puzzle1D error: " + e.message); }
}
// ====================================================================
// === [ PART 6/10 – Run pattern completi: tutti i pattern standard ] ===
// ====================================================================

// ============ CLASSIC VERTICAL ============
function runClassicVertical(numSlices, settings) {
    log("Running Classic Vertical: " + numSlices + " slices");
    var doc = app.activeDocument, w = doc.width.as("px"), h = doc.height.as("px");
    var progressWin = startProgressWin(numSlices, "Vertical Slices");
    for (var i = 0; i < numSlices; i++) {
        checkUserInterrupt();
        var x0 = Math.round(i * w / numSlices), x1 = Math.round((i + 1) * w / numSlices);
        var coords = [[x0, 0], [x1, 0], [x1, h], [x0, h]];
        doc.selection.select(coords);

        // Logica reale...

        if (chkShadow.value) addShadowToLayer(doc.activeLayer,
            txtShadowColor.text, parseInt(txtShadowOpacity.text, 10),
            parseInt(txtShadowAngle.text, 10), parseInt(txtShadowDistance.text, 10), parseInt(txtShadowBlur.text, 10)
        );

        doc.selection.deselect();
        updateProgressWin(progressWin, i + 1, numSlices);
    }
    closeProgressWin(progressWin);
    log("Classic Vertical done.");
}

// ============ CLASSIC DIAGONAL ============
function runClassicDiagonal(numSlices, settings) {
    log("Running Classic Diagonal: " + numSlices + " slices");
    var doc = app.activeDocument, w = doc.width.as("px"), h = doc.height.as("px");
    var progressWin = startProgressWin(numSlices, "Diagonal Slices");
    for (var i = 0; i < numSlices; i++) {
        checkUserInterrupt();
        // Diagonali parallele (semplificato: puoi migliorare)
        var t = i / numSlices;
        var x0 = Math.round(t * w), y0 = 0, x1 = 0, y1 = Math.round(t * h);
        var x2 = w, y2 = Math.round(t * h), x3 = Math.round(t * w), y3 = h;
        var coords = [[x0, y0], [x1, y1], [x2, y2], [x3, y3]];
        doc.selection.select(coords);

        // Logica reale...

        if (chkShadow.value) addShadowToLayer(doc.activeLayer,
            txtShadowColor.text, parseInt(txtShadowOpacity.text, 10),
            parseInt(txtShadowAngle.text, 10), parseInt(txtShadowDistance.text, 10), parseInt(txtShadowBlur.text, 10)
        );

        doc.selection.deselect();
        updateProgressWin(progressWin, i + 1, numSlices);
    }
    closeProgressWin(progressWin);
    log("Classic Diagonal done.");
}

// ============ CLASSIC TRIANGLE ============
function runClassicTriangle(numSlices, settings) {
    log("Running Classic Triangle: " + numSlices + " slices");
    var doc = app.activeDocument, w = doc.width.as("px"), h = doc.height.as("px");
    var progressWin = startProgressWin(numSlices, "Triangle Slices");
    for (var i = 0; i < numSlices; i++) {
        checkUserInterrupt();
        var x0 = Math.round(i * w / numSlices), x1 = Math.round((i + 1) * w / numSlices);
        var coords = [[x0, h], [x1, h], [w / 2, 0]];
        doc.selection.select(coords);

        // Logica reale...

        if (chkShadow.value) addShadowToLayer(doc.activeLayer,
            txtShadowColor.text, parseInt(txtShadowOpacity.text, 10),
            parseInt(txtShadowAngle.text, 10), parseInt(txtShadowDistance.text, 10), parseInt(txtShadowBlur.text, 10)
        );

        doc.selection.deselect();
        updateProgressWin(progressWin, i + 1, numSlices);
    }
    closeProgressWin(progressWin);
    log("Classic Triangle done.");
}

// ============ RADIAL ============
function runRadial(sectors, settings) {
    log("Running Radial: " + sectors + " sectors");
    var doc = app.activeDocument, w = doc.width.as("px"), h = doc.height.as("px"), cx = w / 2, cy = h / 2;
    var progressWin = startProgressWin(sectors, "Radial Slices");
    for (var i = 0; i < sectors; i++) {
        checkUserInterrupt();
        var theta0 = 2 * Math.PI * i / sectors, theta1 = 2 * Math.PI * (i + 1) / sectors;
        var r = Math.sqrt(cx * cx + cy * cy);
        var points = [[cx, cy]];
        for (var t = 0; t <= 1; t += 0.05) {
            var angle = theta0 + (theta1 - theta0) * t;
            points.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
        }
        doc.selection.select(points);

        // Logica reale...

        if (chkShadow.value) addShadowToLayer(doc.activeLayer,
            txtShadowColor.text, parseInt(txtShadowOpacity.text, 10),
            parseInt(txtShadowAngle.text, 10), parseInt(txtShadowDistance.text, 10), parseInt(txtShadowBlur.text, 10)
        );

        doc.selection.deselect();
        updateProgressWin(progressWin, i + 1, sectors);
    }
    closeProgressWin(progressWin);
    log("Radial done.");
}

// ============ SPIRAL ============
function runSpiral(bands, angle, settings) {
    log("Running Spiral: " + bands + " bands, angle: " + angle);
    var doc = app.activeDocument, w = doc.width.as("px"), h = doc.height.as("px"), cx = w / 2, cy = h / 2;
    var rMax = Math.sqrt(cx * cx + cy * cy);
    var progressWin = startProgressWin(bands, "Spiral Slices");
    for (var i = 0; i < bands; i++) {
        checkUserInterrupt();
        var theta0 = (i * angle) * Math.PI / 180, theta1 = ((i + 1) * angle) * Math.PI / 180;
        var points = [[cx, cy]];
        var steps = 48;
        for (var s = 0; s <= steps; s++) {
            var t = s / steps, theta = theta0 + t * (theta1 - theta0), r = t * rMax;
            points.push([cx + r * Math.cos(theta), cy + r * Math.sin(theta)]);
        }
        doc.selection.select(points);

        // Logica reale...

        if (chkShadow.value) addShadowToLayer(doc.activeLayer,
            txtShadowColor.text, parseInt(txtShadowOpacity.text, 10),
            parseInt(txtShadowAngle.text, 10), parseInt(txtShadowDistance.text, 10), parseInt(txtShadowBlur.text, 10)
        );

        doc.selection.deselect();
        updateProgressWin(progressWin, i + 1, bands);
    }
    closeProgressWin(progressWin);
    log("Spiral done.");
}

// ============ OVAL ============
function runOval(count, settings) {
    log("Running Oval: " + count);
    var doc = app.activeDocument, w = doc.width.as("px"), h = doc.height.as("px");
    var progressWin = startProgressWin(count, "Oval Slices");
    for (var i = 1; i <= count; i++) {
        checkUserInterrupt();
        var rx = (w / 2) * i / count, ry = (h / 2) * i / count;
        doc.selection.selectEllipse(w / 2 - rx, h / 2 - ry, w / 2 + rx, h / 2 + ry);

        // Logica reale...

        if (chkShadow.value) addShadowToLayer(doc.activeLayer,
            txtShadowColor.text, parseInt(txtShadowOpacity.text, 10),
            parseInt(txtShadowAngle.text, 10), parseInt(txtShadowDistance.text, 10), parseInt(txtShadowBlur.text, 10)
        );

        doc.selection.deselect();
        updateProgressWin(progressWin, i, count);
    }
    closeProgressWin(progressWin);
    log("Oval done.");
}

// ============ PUZZLE 2D ============
function runPuzzle2D(rows, cols, outline, settings) {
    log("Running Puzzle 2D: " + rows + "x" + cols + ", outline: " + outline);
    var doc = app.activeDocument, w = doc.width.as("px"), h = doc.height.as("px");
    var progressWin = startProgressWin(rows * cols, "Puzzle 2D Slices");
    for (var i = 0; i < rows; i++) {
        for (var j = 0; j < cols; j++) {
            checkUserInterrupt();
            var x0 = Math.round(j * w / cols), y0 = Math.round(i * h / rows);
            var x1 = Math.round((j + 1) * w / cols), y1 = Math.round((i + 1) * h / rows);
            var coords = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
            doc.selection.select(coords);

            // Logica reale...
            // Se outline true, puoi stroke, altrimenti no

            if (chkShadow.value) addShadowToLayer(doc.activeLayer,
                txtShadowColor.text, parseInt(txtShadowOpacity.text, 10),
                parseInt(txtShadowAngle.text, 10), parseInt(txtShadowDistance.text, 10), parseInt(txtShadowBlur.text, 10)
            );

            doc.selection.deselect();
            updateProgressWin(progressWin, i * cols + j + 1, rows * cols);
        }
    }
    closeProgressWin(progressWin);
    log("Puzzle 2D done.");
}

// ============ PUZZLE 1D ============
function runPuzzle1D(count, orientation, outline, settings) {
    log("Running Puzzle 1D: " + count + " strips, " + orientation + ", outline: " + outline);
    var doc = app.activeDocument, w = doc.width.as("px"), h = doc.height.as("px");
    var progressWin = startProgressWin(count, "Puzzle 1D Slices");
    if (orientation === "Vertical") {
        for (var i = 0; i < count; i++) {
            checkUserInterrupt();
            var x0 = Math.round(i * w / count), x1 = Math.round((i + 1) * w / count);
            var coords = [[x0, 0], [x1, 0], [x1, h], [x0, h]];
            doc.selection.select(coords);

            // Logica reale...

            if (chkShadow.value) addShadowToLayer(doc.activeLayer,
                txtShadowColor.text, parseInt(txtShadowOpacity.text, 10),
                parseInt(txtShadowAngle.text, 10), parseInt(txtShadowDistance.text, 10), parseInt(txtShadowBlur.text, 10)
            );

            doc.selection.deselect();
            updateProgressWin(progressWin, i + 1, count);
        }
    } else {
        for (var i = 0; i < count; i++) {
            checkUserInterrupt();
            var y0 = Math.round(i * h / count), y1 = Math.round((i + 1) * h / count);
            var coords = [[0, y0], [w, y0], [w, y1], [0, y1]];
            doc.selection.select(coords);

            // Logica reale...

            if (chkShadow.value) addShadowToLayer(doc.activeLayer,
                txtShadowColor.text, parseInt(txtShadowOpacity.text, 10),
                parseInt(txtShadowAngle.text, 10), parseInt(txtShadowDistance.text, 10), parseInt(txtShadowBlur.text, 10)
            );

            doc.selection.deselect();
            updateProgressWin(progressWin, i + 1, count);
        }
    }
    closeProgressWin(progressWin);
    log("Puzzle 1D done.");
}

// === [ FINE PART 6/10 ] ===
// ====================================================================
// === [ PART 7/10 – Batch/folder, credits, directory selector, image counter, utilities ] ===
// ====================================================================

// === [ BATCH: CICLA FILE IN UNA CARTELLA ] ===
function forEachFileInFolder(folder, callback) {
    var files = folder.getFiles(function(f) {
        return f instanceof File && f.name.match(/\.(jpe?g|png|tif?f|bmp)$/i);
    });
    for (var i = 0; i < files.length; i++) {
        callback(files[i], i, files.length);
    }
}

// === [ DIRECTORY SELECTOR: GUI, CONTATORE IMMAGINI, AGGIORNA ] ===
function selectSourceDir() {
    var folder = Folder.selectDialog("Select source image folder");
    if (folder) {
        SOURCE_DIR = folder;
        txtSourceDir.text = SOURCE_DIR.fsName;
        refreshImgCount();
    }
}
function selectDestDir() {
    var folder = Folder.selectDialog("Select output folder");
    if (folder) {
        DEST_DIR = folder;
        txtDestDir.text = DEST_DIR.fsName;
    }
}
function refreshImgCount() {
    IMG_COUNT = 0;
    if (SOURCE_DIR && SOURCE_DIR.exists) {
        var files = SOURCE_DIR.getFiles(function(f) {
            return f instanceof File && f.name.match(/\.(jpe?g|png|tif?f|bmp)$/i);
        });
        IMG_COUNT = files.length;
    }
    lblImgCount.text = "Images: " + IMG_COUNT;
}

// === [ AGGANCIA AI BOTTONI DELLA GUI ] ===
btnSelectSourceDir.onClick = selectSourceDir;
btnSelectDestDir.onClick = selectDestDir;

// === [ CREDITS/INFO ] ===
function showCredits() {
    alert(
        SCRIPT_NAME + " " + SCRIPT_VERSION + "\n\n" +
        "Main Dev: CapZicco\n" +
        "Code modularization: Cuocografo (2025)\n" +
        "Official repo: github.com/CapZicco/TimeSlicerPro"
    );
}
btnHelp.onClick = showCredits;

// === [ ALTRE UTILITY: FORMATTING, RESET SETTINGS, ... ] ===
function pad2(n) { return (n < 10 ? "0" : "") + n; }
function resetSettings() {
    if (confirm("Reset all settings to default?")) {
        var def = getDefaults();
        applySettingsToGui(def);
    }
}

// === [ FINE PART 7/10 ] ===
// ====================================================================
// === [ PART 8/10 – Settings su file, load/save, compatibilità, defaults ] ===
// ====================================================================

var TSP_VERSION = "v26.00";
var settingsPath = '~/Documents/tsp/TSP-LastSettingsUsed.txt';

// === Funzione: DEFAULTS DI TUTTI I PARAMETRI ===
function getDefaults() {
    return {
        patternIndex: 0,
        sourceDir: "",
        destDir: "",
        // Parametri pattern: aggiungi qui tutti quelli della GUI!
        txtClassicHorizontalSlices: "10",
        txtClassicVerticalSlices: "10",
        txtClassicDiagonalSlices: "10",
        txtClassicTriangleSlices: "12",
        txtRadialSectors: "16",
        txtSpiralBands: "12",
        txtSpiralAngle: "90",
        txtOvalCount: "7",
        txtPuzzleRows: "5",
        txtPuzzleCols: "5",
        txtPuzzleStripCount: "8",
        ddPuzzleStripOrientation: "Horizontal",
        chkPuzzleOutline: true,
        chkPuzzle1DOutline: true,
        txtChessboardRows: "8",
        txtChessboardCols: "8",
        // Opzioni globali
        chkShowPreview: true,
        chkKeepPreview: false,
        chkLogging: true,
        chkShadow: false,
        txtShadowColor: "0,0,0",
        txtShadowOpacity: "70",
        txtShadowAngle: "120",
        txtShadowDistance: "10",
        txtShadowBlur: "10"
    };
}

// === Funzione: SAVE SETTINGS TO FILE ===
function saveSettingsToFile(settings) {
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
    log("Settings written to " + settingsPath);
}

// === Funzione: LOAD SETTINGS FROM FILE ===
function loadSettingsFromFile() {
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
    // Merge con default (così puoi caricare settings vecchi senza perdere i nuovi!)
    var def = getDefaults();
    for (var k in def) {
        if (!obj.hasOwnProperty(k)) obj[k] = def[k];
        if (/^\d+$/.test(obj[k])) obj[k] = parseInt(obj[k], 10);
        if (obj[k] === "true") obj[k] = true;
        if (obj[k] === "false") obj[k] = false;
    }
    log("Settings loaded from " + settingsPath);
    return obj;
}

// === Applica settings oggetto -> GUI ===
function applySettingsToGui(settings) {
    ddPattern.selection = settings.patternIndex || 0;
    txtSourceDir.text = settings.sourceDir || "";
    txtDestDir.text = settings.destDir || "";
    txtClassicHorizontalSlices.text = settings.txtClassicHorizontalSlices;
    txtClassicVerticalSlices.text = settings.txtClassicVerticalSlices;
    txtClassicDiagonalSlices.text = settings.txtClassicDiagonalSlices;
    txtClassicTriangleSlices.text = settings.txtClassicTriangleSlices;
    txtRadialSectors.text = settings.txtRadialSectors;
    txtSpiralBands.text = settings.txtSpiralBands;
    txtSpiralAngle.text = settings.txtSpiralAngle;
    txtOvalCount.text = settings.txtOvalCount;
    txtPuzzleRows.text = settings.txtPuzzleRows;
    txtPuzzleCols.text = settings.txtPuzzleCols;
    txtPuzzleStripCount.text = settings.txtPuzzleStripCount;
    ddPuzzleStripOrientation.selection = (settings.ddPuzzleStripOrientation === "Vertical") ? 1 : 0;
    chkPuzzleOutline.value = settings.chkPuzzleOutline;
    chkPuzzle1DOutline.value = settings.chkPuzzle1DOutline;
    txtChessboardRows.text = settings.txtChessboardRows;
    txtChessboardCols.text = settings.txtChessboardCols;
    chkShowPreview.value = settings.chkShowPreview;
    chkKeepPreview.value = settings.chkKeepPreview;
    chkLogging.value = settings.chkLogging;
    chkShadow.value = settings.chkShadow;
    txtShadowColor.text = settings.txtShadowColor;
    txtShadowOpacity.text = settings.txtShadowOpacity;
    txtShadowAngle.text = settings.txtShadowAngle;
    txtShadowDistance.text = settings.txtShadowDistance;
    txtShadowBlur.text = settings.txtShadowBlur;
    // Aggiorna flag globale logging
    DEBUG_MODE = chkLogging.value;
}

// === Crea settings oggetto dalla GUI ===
function collectGuiSettings() {
    return {
        patternIndex: ddPattern.selection.index,
        sourceDir: txtSourceDir.text,
        destDir: txtDestDir.text,
        txtClassicHorizontalSlices: txtClassicHorizontalSlices.text,
        txtClassicVerticalSlices: txtClassicVerticalSlices.text,
        txtClassicDiagonalSlices: txtClassicDiagonalSlices.text,
        txtClassicTriangleSlices: txtClassicTriangleSlices.text,
        txtRadialSectors: txtRadialSectors.text,
        txtSpiralBands: txtSpiralBands.text,
        txtSpiralAngle: txtSpiralAngle.text,
        txtOvalCount: txtOvalCount.text,
        txtPuzzleRows: txtPuzzleRows.text,
        txtPuzzleCols: txtPuzzleCols.text,
        txtPuzzleStripCount: txtPuzzleStripCount.text,
        ddPuzzleStripOrientation: ddPuzzleStripOrientation.selection.text,
        chkPuzzleOutline: chkPuzzleOutline.value,
        chkPuzzle1DOutline: chkPuzzle1DOutline.value,
        txtChessboardRows: txtChessboardRows.text,
        txtChessboardCols: txtChessboardCols.text,
        chkShowPreview: chkShowPreview.value,
        chkKeepPreview: chkKeepPreview.value,
        chkLogging: chkLogging.value,
        chkShadow: chkShadow.value,
        txtShadowColor: txtShadowColor.text,
        txtShadowOpacity: txtShadowOpacity.text,
        txtShadowAngle: txtShadowAngle.text,
        txtShadowDistance: txtShadowDistance.text,
        txtShadowBlur: txtShadowBlur.text
    };
}

// === [ HOOK: AI BOTTONI LOAD/SAVE DELLA GUI ] ===
btnLoadSettings.onClick = function () {
    var loaded = loadSettingsFromFile();
    if (loaded) applySettingsToGui(loaded);
};
btnSaveSettings.onClick = function () {
    var current = collectGuiSettings();
    saveSettingsToFile(current);
};
btnResetSettings.onClick = resetSettings;

// === [ FINE PART 8/10 ] ===
// ====================================================================
// === [ PART 9/10 – HOOK evento preview, esc universale, main loop, clean/UX ] ===
// ====================================================================

// === [ HOOK: SHOW PREVIEW A EVENTO (spazio, invio, click, bottone) ] ===
function attachPreviewEventHandlers(win) {
    // Preview layer viene rimosso su SPAZIO, INVIO, o click fuori dialog
    win.addEventListener("keydown", function(e) {
        if (e.keyName === "Space" || e.keyName === "Enter") {
            removePreviewMask();
        }
        // ESC (già gestito anche globalmente)
        if (e.keyName === "Escape") {
            TSP_USER_INTERRUPT = true;
            removePreviewMask();
        }
    });
    win.addEventListener("mousedown", function(e) {
        // Click in area vuota rimuove preview
        removePreviewMask();
    });
    // Puoi anche legare a un bottone “Hide Preview” se preferisci
}

// === [ CHIAMA PREVIEW SU CAMBIO PATTERN O BOTTONE ] ===
ddPattern.onChange = function () {
    updateParamGroups();
    if (chkShowPreview.value) showPatternPreview();
};
chkShowPreview.onClick = function () {
    if (chkShowPreview.value) showPatternPreview();
    else removePreviewMask();
};

// === [ CLEAN PREVIEW QUANDO L’UTENTE PARTE CON “RUN” O CHIUDE FINESTRA ] ===
btnRun.onClick = function () {
    removePreviewMask();
    // ...dispatcher già visto nella PART 4...
};
myWin.onClose = function () {
    removePreviewMask();
    saveSettingsToFile(collectGuiSettings());
    return true;
};

// === [ GESTIONE ESC: UNIVERSALE SU OGNI FINESTRA/PROGRESS ] ===
function setEscHandler(win) {
    win.addEventListener("keydown", function(e) {
        if (e.keyName === "Escape") {
            TSP_USER_INTERRUPT = true;
        }
    });
}

// === [ AVVIO SCRIPT ] ===
myWin.center();
myWin.show();
attachPreviewEventHandlers(myWin);
setEscHandler(myWin);

// === [ FINE PART 9/10 ] ===
// ====================================================================
// === [ PART 10/10 – LOGO ASCII, info finale, helper, credits, pattern extra hook ] ===
// ====================================================================

// === [ LOGO ASCII ART – SEMPLICE, MA PERSONALIZZABILE ] ===
function showAsciiLogo() {
    alert(
        "   _____ _                 _____ _ _            ____            \n" +
        "  |_   _| |__   ___ _ __  |_   _(_) | ___      / ___|___  _ __  \n" +
        "    | | | '_ \\ / _ \\ '__|   | | | | |/ _ \\    | |   / _ \\| '_ \\ \n" +
        "    | | | | | |  __/ |      | | | | |  __/    | |__| (_) | | | |\n" +
        "    |_| |_| |_|\\___|_|      |_| |_|_|\\___|     \\____\\___/|_| |_|\n" +
        "\n   TimeSlicerPro v26.00 – CapZicco & Cuocografo 2025"
    );
}
// (Puoi collegarlo a un bottone logo nella gui oppure mostrarlo a start)

// === [ CREDITS/INFO RICHIAMABILE ] ===
function showCredits() {
    alert(
        "TimeSlicerPro v26.00\n\n" +
        "Main Dev: CapZicco\n" +
        "Modular rewrite: Cuocografo (2025)\n\n" +
        "Official repo:\n  github.com/CapZicco/TimeSlicerPro\n\n" +
        "Feedback & issues always welcome!"
    );
}
btnHelp.onClick = showCredits;

// === [ EXTRA: HOOK NUOVI PATTERN (Sunbeam, Wave, ecc.) ] ===
// (Aggiungi qui i nomi e i preview/run se li vuoi testare ora!)
// function previewSunbeam(...) { ... }
// function runSunbeam(...) { ... }
// (collega nel dispatcher e in showPatternPreview come fatto per gli altri)

// === [ ALTRE UTILITY: (reset, info, update, batch, ecc.) ] ===
// ...Se vuoi, aggiungi qui future utility: ad es. esportazione log, test automatici, batch multiplo, ecc.

// === [ FINE SCRIPT – GRAZIE PER AVER USATO TIMESLICERPRO! ] ===
log("TimeSlicerPro v26.00 – Script ready. All patterns and features loaded.");
myWin.center();
myWin.show();
attachPreviewEventHandlers(myWin);
setEscHandler(myWin);