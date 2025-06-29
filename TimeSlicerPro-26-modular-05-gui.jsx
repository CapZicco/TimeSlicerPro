// ====================================================================
// === BLOCCO 1 – GLOBALI, LOGGING, SETTINGS, UTILS ===================
// ====================================================================

// === [ CREDITS / INFO ] ===
/*
    Script created by CapZicco, modular rewrite and features by Copilot (2025)
    Official repo: https://github.com/CapZicco/TimeSlicerPro
    Collaborators welcome!
*/

// === [ GLOBAL CONSTANTS & FLAGS ] ===
var SCRIPT_NAME = "TimeSlicerPro";
var SCRIPT_VERSION = "v26.05";
var DEBUG_MODE = true;

// === Global: source/destination directories ===
var SOURCE_DIR = null;
var DEST_DIR = null;
var IMG_COUNT = 0;

// === SETTINGS PATH ===
var settingsFolderPath = '~/Documents/tsp/';
var lastSettingsFileName = "TSP-LastSettingsUsed.txt";
var LAST_SETTINGS_PATH = settingsFolderPath + lastSettingsFileName;

// === LOGGING ===
function log(msg) {
    if (DEBUG_MODE) $.writeln("[LOG] " + msg);
}

// === [ FILE UTILS ] ===
function fileExist(f) {
    try { if (!f) return false; return File(f).exists; } catch (e) { return false; }
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
function getSourceFiles() {
    if (!SOURCE_DIR) return [];
    return SOURCE_DIR.getFiles(function(f) { return f instanceof File && f.name.match(/\.(jpe?g|png|tif?f|bmp)$/i); });
}
function getDestFolder() {
    if (!DEST_DIR) return null;
    return DEST_DIR;
}

// === [ SETTINGS: LOAD/SAVE/DEFAULTS ] ===
function getDefaults() {
    return {
        sourceDir: "",
        destDir: "",
        txtOutputFile: "output",
        outputType: "jpg",
        outputPattern: "Horizontal (Top to Bottom)",
        txtOutputQuality: "12",
        txtHorizontalSlices: "10",
        txtVerticalSlices: "10",
        txtDiagonalSlices: "10",
        txtTriangleSlices: "12",
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
function loadSettingsObject() {
    var file = new File(LAST_SETTINGS_PATH);
    if (!file.exists) return getDefaults();
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
        // Parse numeri
        if (/^\d+$/.test(obj[k])) obj[k] = parseInt(obj[k], 10);
        // Parse booleani
        if (obj[k] === "true") obj[k] = true;
        if (obj[k] === "false") obj[k] = false;
    }
    return obj;
}
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
// Caricamento manuale dei settings tramite dialog: mostra solo .txt nella cartella giusta
function loadSettingsWithPicker() {
    var folder = Folder(settingsFolderPath);
    if (!folder.exists) folder.create();
    var file = File.openDialog("Select settings file:", "*.txt", folder);
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
function saveSettingsWithDialog() {
    var settings = collectSettingsFromGui();
    var defaultName = lastSettingsFileName.replace(".txt", "");
    var folder = Folder(settingsFolderPath);
    if (!folder.exists) folder.create();
    var file = File.saveDialog("Save settings as...", defaultName + ".txt", "*.txt", folder);
    if (!file) return;
    file.open("w");
    for (var k in settings)
        if (settings.hasOwnProperty(k)) file.writeln(k + ": " + settings[k]);
    file.close();
    alert("Settings saved!", "TimeSlicerPro");
}

// === [ FINE BLOCCO 1 ] ===
// ====================================================================
// === BLOCCO 2 – GUI PRINCIPALE, PATTERN E PARAMETRI ================
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

// --- [ PATTERN GROUP: Dropdown + param blocks (ordine alfabetico) ] ---
var gPattern = myWin.add("group");

var ddPattern = gPattern.add("dropdownlist", undefined, [
    "Horizontal (Top to Bottom)",
    "Horizontal (Bottom to Top)",
    "Vertical (Left to Right)",
    "Vertical (Right to Left)",
    "Diagonal (Main)",
    "Diagonal (Anti)",
    "Triangle",
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

// --- Horizontal ---
var gHorizontal = gParams.add("group"); gHorizontal.orientation = "row";
gHorizontal.add("statictext", undefined, "Slices:");
var txtHorizontalSlices = gHorizontal.add("edittext", undefined, "10"); txtHorizontalSlices.characters = 4;

// --- Vertical ---
var gVertical = gParams.add("group"); gVertical.orientation = "row"; gVertical.visible = false;
gVertical.add("statictext", undefined, "Slices:");
var txtVerticalSlices = gVertical.add("edittext", undefined, "10"); txtVerticalSlices.characters = 4;

// --- Diagonal ---
var gDiagonal = gParams.add("group"); gDiagonal.orientation = "row"; gDiagonal.visible = false;
gDiagonal.add("statictext", undefined, "Slices:");
var txtDiagonalSlices = gDiagonal.add("edittext", undefined, "10"); txtDiagonalSlices.characters = 4;

// --- Triangle ---
var gTriangle = gParams.add("group"); gTriangle.orientation = "row"; gTriangle.visible = false;
gTriangle.add("statictext", undefined, "Slices:");
var txtTriangleSlices = gTriangle.add("edittext", undefined, "12"); txtTriangleSlices.characters = 4;

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

// === [ GUI: SPIRAL ] ===
var gSpiral = gParams.add("group"); gSpiral.orientation = "row";
gSpiral.add("statictext", undefined, "Bands:");
var txtSpiralBands = gSpiral.add("edittext", undefined, "12"); txtSpiralBands.characters = 4;
gSpiral.add("statictext", undefined, "Angle:");
var txtSpiralAngle = gSpiral.add("edittext", undefined, "90"); txtSpiralAngle.characters = 4;
// Dropdown direzione
gSpiral.add("statictext", undefined, "Direction:");
var ddSpiralDirection = gSpiral.add("dropdownlist", undefined, ["Inside to Outside", "Outside to Inside"]);
ddSpiralDirection.selection = 0; // default

// === [ GUI: SUNBEAM ] ===
var gSunbeam = gParams.add("group"); gSunbeam.orientation = "row";
gSunbeam.add("statictext", undefined, "Beams:");
var txtSunbeamBeams = gSunbeam.add("edittext", undefined, "16"); txtSunbeamBeams.characters = 4;
// Dropdown direzione
gSunbeam.add("statictext", undefined, "Direction:");
var ddSunbeamDirection = gSunbeam.add("dropdownlist", undefined, ["Inside to Outside", "Outside to Inside"]);
ddSunbeamDirection.selection = 0;

// --- Wave ---
var gWave = gParams.add("group"); gWave.orientation = "row"; gWave.visible = false;
gWave.add("statictext", undefined, "Waves:");
var txtWaveCount = gWave.add("edittext", undefined, "8"); txtWaveCount.characters = 4;

// === [ PARAMETER PANEL VISIBILITY ] ===
function updateParamGroups() {
    var visList = [
        gHorizontal, gVertical, gDiagonal, gTriangle,
        gChessboard, gHexGrid, gOval, gPuzzle2d, gPuzzle1d, gRadial, gSpiral, gSunbeam, gWave
    ];
    for (var i = 0; i < visList.length; i++) visList[i].visible = false;
    switch (ddPattern.selection.text) {
        case "Horizontal (Top to Bottom)":
        case "Horizontal (Bottom to Top)":
            gHorizontal.visible = true; break;
        case "Vertical (Left to Right)":
        case "Vertical (Right to Left)":
            gVertical.visible = true; break;
        case "Diagonal (Main)":
        case "Diagonal (Anti)":
            gDiagonal.visible = true; break;
        case "Triangle":
            gTriangle.visible = true; break;
        case "Chessboard":
            gChessboard.visible = true; break;
        case "HexGrid":
            gHexGrid.visible = true; break;
        case "Oval":
            gOval.visible = true; break;
        case "Puzzle (2D)":
            gPuzzle2d.visible = true; break;
        case "Puzzle Strip (1D)":
            gPuzzle1d.visible = true; break;
        case "Radial":
            gRadial.visible = true; break;
        case "Spiral":
            gSpiral.visible = true; break;
        case "Sunbeam":
            gSunbeam.visible = true; break;
        case "Wave":
            gWave.visible = true; break;
    }
    updateSuggestedFilename();
}
ddPattern.onChange = updateParamGroups;
updateParamGroups(); // Avvia con pattern default visibile

// === [ FINE BLOCCO 2 ] ===
// ====================================================================
// === TimeSlicerPro v26.05 – BLOCCO 3: GUI TECH, PATTERN, DISPATCHER ====
// ====================================================================

// === [ CREDITS / INFO ] ===
/*
    TimeSlicerPro v26.05 – GUI Tech edition
    Main Dev: CapZicco – Modular rewrite: Copilot (2025)
    https://github.com/CapZicco/TimeSlicerPro
*/

// === [ GLOBALS & CONSTS ] ===
var SCRIPT_NAME = "TimeSlicerPro";
var SCRIPT_VERSION = "26.05";
var DEBUG_MODE = true;

// === [ PATTERN TOOLTIP DESCRIPTIONS ] ===
var patternDescriptions = [
 "Slicing: Horizontal, top to bottom.",
 "Slicing: Horizontal, bottom to top.",
 "Slicing: Vertical, left to right.",
 "Slicing: Vertical, right to left.",
 "Slicing: Main diagonal (↘).",
 "Slicing: Diagonal anti (↙).",
 "Slicing: Triangle - High level, triangular subdivision. ",
 "Checkerboard: rows & columns.",
 "Hexagonal grid.",
 "Concentric oval rings (in/out).",
 "2D puzzles: rows & columns.",
 "1D puzzles: horizontal/vertical stripes.",
 "Radial sectors (pie type).",
 "Spiral banding.",
 "Sunbeam type rays.",
 "Sine waves."
];

// === [ MAIN DIALOG WINDOW ] ===
var myWin = new Window("dialog", SCRIPT_NAME + " " + SCRIPT_VERSION, undefined, { resizeable: true });

// --- [ HEADER / LOGO / TITOLO ] ---
var gTitle = myWin.add("group", undefined, "title");
gTitle.orientation = "column";
gTitle.alignment = "center";
var lblTitle = gTitle.add("statictext", undefined, "TimeSlicerPro");
lblTitle.graphics.font = ScriptUI.newFont("Arial", "Bold", 24);
var lblSubtitle = gTitle.add("statictext", undefined, "Modular, batch-ready, tech GUI – v26.05 – by CapZicco & Copilot");
lblSubtitle.graphics.font = ScriptUI.newFont("Arial", "Italic", 11);

// --- [ PATTERN DROPDOWN with TOOLTIP ] ---
var gPattern = myWin.add("group");
gPattern.orientation = "row";
var ddPattern = gPattern.add("dropdownlist", undefined, [
    "Horizontal (Top to Bottom)",
    "Horizontal (Bottom to Top)",
    "Vertical (Left to Right)",
    "Vertical (Right to Left)",
    "Diagonal (Main)",
    "Diagonal (Anti)",
    "Triangle",
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
ddPattern.selection = 0;
var lblPatternInfo = gPattern.add("statictext", undefined, patternDescriptions[0]);
lblPatternInfo.characters = 36;
lblPatternInfo.justify = "left";
ddPattern.onChange = function () {
    lblPatternInfo.text = patternDescriptions[ddPattern.selection.index];
    updateParamGroups();
};

// --- [ DIRECTORY GROUP: SOURCE/DEST ] ---
var gDirs = myWin.add("group");
gDirs.orientation = "row";
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
gCount.add("statictext", undefined, "Images:");
var lblImgCount = gCount.add("statictext", undefined, "0");
lblImgCount.characters = 5;

// === [ PARAMETER PANELS – TECH: SLIDER + NUMERIC ] ===
var gParams = myWin.add("group");
gParams.orientation = "stack";
var paramBlocks = [];

// --- Utility: crea slider+numeric accoppiati ---
function addSliderNumericBlock(parent, label, min, max, defval, step) {
    var g = parent.add("group");
    g.orientation = "row";
    g.add("statictext", undefined, label);
    var slider = g.add("slider", undefined, defval, min, max);
    slider.preferredSize.width = 80;
    var num = g.add("edittext", undefined, defval + "");
    num.characters = 4;
    slider.onChanging = function () { num.text = Math.round(slider.value); };
    num.onChanging = function () { var v = parseInt(num.text, 10); if (!isNaN(v)) slider.value = Math.max(min, Math.min(max, v)); };
    return { slider: slider, numeric: num, group: g };
}

// --- Horizontal Slices ---
var gHorizontal = gParams.add("group"); gHorizontal.orientation = "row";
paramBlocks.horizontal = addSliderNumericBlock(gHorizontal, "Slices:", 1, 100, 10, 1);

// --- Vertical Slices ---
var gVertical = gParams.add("group"); gVertical.orientation = "row"; gVertical.visible = false;
paramBlocks.vertical = addSliderNumericBlock(gVertical, "Slices:", 1, 100, 10, 1);

// --- Diagonal Slices ---
var gDiagonal = gParams.add("group"); gDiagonal.orientation = "row"; gDiagonal.visible = false;
paramBlocks.diagonal = addSliderNumericBlock(gDiagonal, "Slices:", 1, 100, 10, 1);

// --- Triangle Slices ---
var gTriangle = gParams.add("group"); gTriangle.orientation = "row"; gTriangle.visible = false;
paramBlocks.triangle = addSliderNumericBlock(gTriangle, "Slices:", 1, 100, 12, 1);

// --- Chessboard ---
var gChessboard = gParams.add("group"); gChessboard.orientation = "row"; gChessboard.visible = false;
paramBlocks.chessRows = addSliderNumericBlock(gChessboard, "Rows:", 2, 32, 8, 1);
paramBlocks.chessCols = addSliderNumericBlock(gChessboard, "Cols:", 2, 32, 8, 1);

// --- HexGrid ---
var gHexGrid = gParams.add("group"); gHexGrid.orientation = "row"; gHexGrid.visible = false;
paramBlocks.hexSize = addSliderNumericBlock(gHexGrid, "Hex size:", 10, 300, 48, 1);

// --- Oval ---
var gOval = gParams.add("group"); gOval.orientation = "row"; gOval.visible = false;
paramBlocks.ovalCount = addSliderNumericBlock(gOval, "Ovals:", 2, 50, 7, 1);

// --- Puzzle 2D ---
var gPuzzle2d = gParams.add("group"); gPuzzle2d.orientation = "row"; gPuzzle2d.visible = false;
paramBlocks.puzzleRows = addSliderNumericBlock(gPuzzle2d, "Rows:", 2, 20, 5, 1);
paramBlocks.puzzleCols = addSliderNumericBlock(gPuzzle2d, "Cols:", 2, 20, 5, 1);
var chkPuzzleOutline = gPuzzle2d.add("checkbox", undefined, "Outline"); chkPuzzleOutline.value = true;

// --- Puzzle 1D ---
var gPuzzle1d = gParams.add("group"); gPuzzle1d.orientation = "row"; gPuzzle1d.visible = false;
paramBlocks.puzzleStrips = addSliderNumericBlock(gPuzzle1d, "Strips:", 2, 50, 8, 1);
gPuzzle1d.add("statictext", undefined, "Orientation:");
var ddPuzzleStripOrientation = gPuzzle1d.add("dropdownlist", undefined, ["Horizontal", "Vertical"]); ddPuzzleStripOrientation.selection = 0;
var chkPuzzle1DOutline = gPuzzle1d.add("checkbox", undefined, "Outline"); chkPuzzle1DOutline.value = true;

// --- Radial ---
var gRadial = gParams.add("group"); gRadial.orientation = "row"; gRadial.visible = false;
paramBlocks.radialSectors = addSliderNumericBlock(gRadial, "Sectors:", 2, 64, 16, 1);

// --- Spiral ---
var gSpiral = gParams.add("group"); gSpiral.orientation = "row"; gSpiral.visible = false;
paramBlocks.spiralBands = addSliderNumericBlock(gSpiral, "Bands:", 2, 32, 12, 1);
paramBlocks.spiralAngle = addSliderNumericBlock(gSpiral, "Angle:", 10, 360, 90, 1);

// --- Sunbeam ---
var gSunbeam = gParams.add("group"); gSunbeam.orientation = "row"; gSunbeam.visible = false;
paramBlocks.sunbeamBeams = addSliderNumericBlock(gSunbeam, "Beams:", 2, 64, 16, 1);

// --- Wave ---
var gWave = gParams.add("group"); gWave.orientation = "row"; gWave.visible = false;
paramBlocks.waveCount = addSliderNumericBlock(gWave, "Waves:", 1, 50, 8, 1);

// === [ SHADOW PANEL: SLIDER + COLOR PREVIEW ] ===
var gShadow = myWin.add("panel", undefined, "Shadow");
gShadow.orientation = "row";
var chkShadowEnable = gShadow.add("checkbox", undefined, "Enable"); chkShadowEnable.value = false;
paramBlocks.shadowOpacity = addSliderNumericBlock(gShadow, "Opacity:", 0, 100, 80, 1);
paramBlocks.shadowDistance = addSliderNumericBlock(gShadow, "Distance:", 1, 50, 8, 1);
paramBlocks.shadowBlur = addSliderNumericBlock(gShadow, "Blur:", 1, 50, 10, 1);
gShadow.add("statictext", undefined, "Color:");
var txtShadowR = gShadow.add("edittext", undefined, "0"); txtShadowR.characters = 3;
var txtShadowG = gShadow.add("edittext", undefined, "0"); txtShadowG.characters = 3;
var txtShadowB = gShadow.add("edittext", undefined, "0"); txtShadowB.characters = 3;
// --- Color preview box ---
var shadowColorPreview = gShadow.add("panel", undefined, "");
shadowColorPreview.preferredSize = [28, 18];
function updateShadowColorPreview() {
    var r = Math.max(0, Math.min(255, parseInt(txtShadowR.text, 10) || 0));
    var g = Math.max(0, Math.min(255, parseInt(txtShadowG.text, 10) || 0));
    var b = Math.max(0, Math.min(255, parseInt(txtShadowB.text, 10) || 0));
    shadowColorPreview.graphics.backgroundColor = shadowColorPreview.graphics.newBrush(shadowColorPreview.graphics.BrushType.SOLID_COLOR, [r/255, g/255, b/255, 1]);
}

var shadowBoxes = new Array(txtShadowR, txtShadowG, txtShadowB);
for (var i = 0; i < shadowBoxes.length; i++) {
    var box = shadowBoxes[i];
    if (box) box.onChanging = updateShadowColorPreview;
}
updateShadowColorPreview();

// === [ PARAMETER PANEL VISIBILITY ] ===
function updateParamGroups() {
    var visList = [
        gHorizontal, gVertical, gDiagonal, gTriangle, gChessboard, gHexGrid,
        gOval, gPuzzle2d, gPuzzle1d, gRadial, gSpiral, gSunbeam, gWave
    ];
    for (var i = 0; i < visList.length; i++) visList[i].visible = false;
    switch (ddPattern.selection.text) {
        case "Horizontal (Top to Bottom)":
        case "Horizontal (Bottom to Top)":
            gHorizontal.visible = true; break;
        case "Vertical (Left to Right)":
        case "Vertical (Right to Left)":
            gVertical.visible = true; break;
        case "Diagonal (Main)":
        case "Diagonal (Anti)":
            gDiagonal.visible = true; break;
        case "Triangle":
            gTriangle.visible = true; break;
        case "Chessboard":
            gChessboard.visible = true; break;
        case "HexGrid":
            gHexGrid.visible = true; break;
        case "Oval":
            gOval.visible = true; break;
        case "Puzzle (2D)":
            gPuzzle2d.visible = true; break;
        case "Puzzle Strip (1D)":
            gPuzzle1d.visible = true; break;
        case "Radial":
            gRadial.visible = true; break;
        case "Spiral":
            gSpiral.visible = true; break;
        case "Sunbeam":
            gSunbeam.visible = true; break;
        case "Wave":
            gWave.visible = true; break;
    }
}
updateParamGroups();

// === [ OUTPUT PANEL ] ===
var gOutput = myWin.add("panel", undefined, "Output File");
gOutput.orientation = "row";
gOutput.add("statictext", undefined, "Type:");
var ddOutputType = gOutput.add("dropdownlist", undefined, ["JPG", "PNG", "TIFF"]);
ddOutputType.selection = 0;
gOutput.add("statictext", undefined, "Quality:");
var txtOutputQuality = gOutput.add("edittext", undefined, "12");
txtOutputQuality.characters = 2;
gOutput.add("statictext", undefined, "File name:");
var txtOutputFile = gOutput.add("edittext", undefined, "");
txtOutputFile.characters = 28;
txtOutputFile.enabled = false;

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

// === [ ACTION BUTTONS: RUN, CANCEL, ABOUT ] ===
var gActions = myWin.add("group");
gActions.orientation = "row";
var btnRun = gActions.add("button", undefined, "Time Slice");
var btnCancel = gActions.add("button", undefined, "Quit");
var btnAbout = gActions.add("button", undefined, "About");

// === [ GUI HIDE DURING RUN ] ===
function hideGUI() { myWin.visible = false; }
function showGUI() { myWin.visible = true; }

// === [ DISPATCHER: CHIAMA LA FUNZIONE GIUSTA ] ===
btnRun.onClick = function() {
    hideGUI();
    // Qui chiamerai la funzione rendering giusta: esempio
    // runHorizontalSlices(...);
    // Alla fine:
    showGUI();
};
btnCancel.onClick = function() { myWin.close(); };
btnAbout.onClick = function() {
    alert(
        "TimeSlicerPro v26.05\n\n" +
        "Modular, tech GUI, slider+numeric, color preview.\n" +
        "Batch-ready, pattern-agnostic.\n\n" +
        "Dev: CapZicco\nModular rewrite: Copilot 2025\n" +
        "https://github.com/CapZicco/TimeSlicerPro"
    );
};

// === [ FINE BLOCCO 3 ] ===
myWin.center();
myWin.show();
// ====================================================================
// === TimeSlicerPro 26.05– BLOCCO 4: RENDER/PREVIEW PLACEHOLDER =======
// ====================================================================

// === [ FUNZIONI DI RENDERING – UNA PER PATTERN ] ===

// Ogni funzione riceve i parametri dal dispatcher
function runHorizontalSlices(params) {
    alert("RUN Horizontal Slices\nSlices: " + params.slices);
    // TODO: implementa logica rendering
}
function runVerticalSlices(params) {
    alert("RUN Vertical Slices\nSlices: " + params.slices);
    // TODO: implementa logica rendering
}
function runDiagonalSlices(params) {
    alert("RUN Diagonal Slices\nSlices: " + params.slices);
    // TODO: implementa logica rendering
}
function runTriangleSlices(params) {
    alert("RUN Triangle Slices\nSlices: " + params.slices);
    // TODO: implementa logica rendering
}
function runChessboard(params) {
    alert("RUN Chessboard\nRows: " + params.rows + " Cols: " + params.cols);
    // TODO: implementa logica rendering
}
function runHexGrid(params) {
    alert("RUN HexGrid\nSize: " + params.hexSize);
    // TODO: implementa logica rendering
}
function runOval(params) {
    alert("RUN Oval\nOvals: " + params.ovals);
    // TODO: implementa logica rendering
}
function runPuzzle2D(params) {
    alert("RUN Puzzle 2D\nRows: " + params.rows + " Cols: " + params.cols + " Outline: " + params.outline);
    // TODO: implementa logica rendering
}
function runPuzzle1D(params) {
    alert("RUN Puzzle 1D\nStrips: " + params.strips + " Orientation: " + params.orientation + " Outline: " + params.outline);
    // TODO: implementa logica rendering
}
function runRadial(params) {
    alert("RUN Radial\nSectors: " + params.sectors);
    // TODO: implementa logica rendering
}
function runSpiral(params) {
    alert("RUN Spiral\nBands: " + params.bands + " Angle: " + params.angle);
    // TODO: implementa logica rendering
}
function runSunbeam(params) {
    alert("RUN Sunbeam\nBeams: " + params.beams);
    // TODO: implementa logica rendering
}
function runWave(params) {
    alert("RUN Wave\nWaves: " + params.waves);
    // TODO: implementa logica rendering
}

// === [ FUNZIONI DI PREVIEW – UNA PER PATTERN ] ===

function previewHorizontalSlices(params) { /* TODO */ }
function previewVerticalSlices(params) { /* TODO */ }
function previewDiagonalSlices(params) { /* TODO */ }
function previewTriangleSlices(params) { /* TODO */ }
function previewChessboard(params) { /* TODO */ }
function previewHexGrid(params) { /* TODO */ }
function previewOval(params) { /* TODO */ }
function previewPuzzle2D(params) { /* TODO */ }
function previewPuzzle1D(params) { /* TODO */ }
function previewRadial(params) { /* TODO */ }
function previewSpiral(params) { /* TODO */ }
function previewSunbeam(params) { /* TODO */ }
function previewWave(params) { /* TODO */ }

// === [ DISPATCHER – RACCOGLI PARAMETRI E CHIAMA LA FUNZIONE GIUSTA ] ===
btnRun.onClick = function() {
    hideGUI();

    // Raccogli parametri comuni
    var params = {};
    switch (ddPattern.selection.text) {
        case "Horizontal (Top to Bottom)":
        case "Horizontal (Bottom to Top)":
            params.slices = Math.round(paramBlocks.horizontal.slider.value);
            runHorizontalSlices(params);
            break;
        case "Vertical (Left to Right)":
        case "Vertical (Right to Left)":
            params.slices = Math.round(paramBlocks.vertical.slider.value);
            runVerticalSlices(params);
            break;
        case "Diagonal (Main)":
        case "Diagonal (Anti)":
            params.slices = Math.round(paramBlocks.diagonal.slider.value);
            runDiagonalSlices(params);
            break;
        case "Triangle":
            params.slices = Math.round(paramBlocks.triangle.slider.value);
            runTriangleSlices(params);
            break;
        case "Chessboard":
            params.rows = Math.round(paramBlocks.chessRows.slider.value);
            params.cols = Math.round(paramBlocks.chessCols.slider.value);
            runChessboard(params);
            break;
        case "HexGrid":
            params.hexSize = Math.round(paramBlocks.hexSize.slider.value);
            runHexGrid(params);
            break;
        case "Oval":
            params.ovals = Math.round(paramBlocks.ovalCount.slider.value);
            runOval(params);
            break;
        case "Puzzle (2D)":
            params.rows = Math.round(paramBlocks.puzzleRows.slider.value);
            params.cols = Math.round(paramBlocks.puzzleCols.slider.value);
            params.outline = chkPuzzleOutline.value;
            runPuzzle2D(params);
            break;
        case "Puzzle Strip (1D)":
            params.strips = Math.round(paramBlocks.puzzleStrips.slider.value);
            params.orientation = ddPuzzleStripOrientation.selection.text;
            params.outline = chkPuzzle1DOutline.value;
            runPuzzle1D(params);
            break;
        case "Radial":
            params.sectors = Math.round(paramBlocks.radialSectors.slider.value);
            runRadial(params);
            break;
        case "Spiral":
            params.bands = Math.round(paramBlocks.spiralBands.slider.value);
            params.angle = Math.round(paramBlocks.spiralAngle.slider.value);
            runSpiral(params);
            break;
        case "Sunbeam":
            params.beams = Math.round(paramBlocks.sunbeamBeams.slider.value);
            runSunbeam(params);
            break;
        case "Wave":
            params.waves = Math.round(paramBlocks.waveCount.slider.value);
            runWave(params);
            break;
        default:
            alert("Pattern not recognized!");
    }

    showGUI();
};

// === [ PREVIEW HOOK – CHIAMA LA PREVIEW GIUSTA ] ===
chkShowPreview.onClick = function() {
    var params = {};
    switch (ddPattern.selection.text) {
        case "Horizontal (Top to Bottom)":
        case "Horizontal (Bottom to Top)":
            params.slices = Math.round(paramBlocks.horizontal.slider.value);
            previewHorizontalSlices(params); break;
        case "Vertical (Left to Right)":
        case "Vertical (Right to Left)":
            params.slices = Math.round(paramBlocks.vertical.slider.value);
            previewVerticalSlices(params); break;
        case "Diagonal (Main)":
        case "Diagonal (Anti)":
            params.slices = Math.round(paramBlocks.diagonal.slider.value);
            previewDiagonalSlices(params); break;
        case "Triangle":
            params.slices = Math.round(paramBlocks.triangle.slider.value);
            previewTriangleSlices(params); break;
        case "Chessboard":
            params.rows = Math.round(paramBlocks.chessRows.slider.value);
            params.cols = Math.round(paramBlocks.chessCols.slider.value);
            previewChessboard(params); break;
        case "HexGrid":
            params.hexSize = Math.round(paramBlocks.hexSize.slider.value);
            previewHexGrid(params); break;
        case "Oval":
            params.ovals = Math.round(paramBlocks.ovalCount.slider.value);
            previewOval(params); break;
        case "Puzzle (2D)":
            params.rows = Math.round(paramBlocks.puzzleRows.slider.value);
            params.cols = Math.round(paramBlocks.puzzleCols.slider.value);
            params.outline = chkPuzzleOutline.value;
            previewPuzzle2D(params); break;
        case "Puzzle Strip (1D)":
            params.strips = Math.round(paramBlocks.puzzleStrips.slider.value);
            params.orientation = ddPuzzleStripOrientation.selection.text;
            params.outline = chkPuzzle1DOutline.value;
            previewPuzzle1D(params); break;
        case "Radial":
            params.sectors = Math.round(paramBlocks.radialSectors.slider.value);
            previewRadial(params); break;
        case "Spiral":
            params.bands = Math.round(paramBlocks.spiralBands.slider.value);
            params.angle = Math.round(paramBlocks.spiralAngle.slider.value);
            previewSpiral(params); break;
        case "Sunbeam":
            params.beams = Math.round(paramBlocks.sunbeamBeams.slider.value);
            previewSunbeam(params); break;
        case "Wave":
            params.waves = Math.round(paramBlocks.waveCount.slider.value);
            previewWave(params); break;
        default:
            // nessuna preview
    }
};

// === [ FINE BLOCCO 4 ] ===
// ====================================================================
// === TimeSlicerPro v26.05 – BLOCCO 5: UTILITY, SETTINGS, PROGRESS  =====
// ====================================================================

// === [ SALVATAGGIO SETTINGS ] ===
function saveSettingsToFile(path) {
    var settings = collectCurrentSettings();
    var f = new File(path);
    if (f.open("w")) {
        f.write(JSON.stringify(settings, null, 2));
        f.close();
        return true;
    }
    return false;
}
function loadSettingsFromFile(path) {
    var f = new File(path);
    if (!f.exists) return false;
    if (f.open("r")) {
        var txt = f.read();
        f.close();
        var obj = JSON.parse(txt);
        applySettingsToGUI(obj);
        return true;
    }
    return false;
}
function resetSettings() {
    // Imposta i valori di default su tutti parametri
    // (Per semplicità puoi richiamare un oggetto defaultSettings)
    applySettingsToGUI(defaultSettings);
}

// === [ COLLECT & APPLY SETTINGS ] ===
function collectCurrentSettings() {
    return {
        pattern: ddPattern.selection.index,
        // inserisci qui tutti i parametri che vuoi salvare, esempio:
        horizontalSlices: Math.round(paramBlocks.horizontal.slider.value),
        verticalSlices: Math.round(paramBlocks.vertical.slider.value),
        diagonalSlices: Math.round(paramBlocks.diagonal.slider.value),
        triangleSlices: Math.round(paramBlocks.triangle.slider.value),
        chessRows: Math.round(paramBlocks.chessRows.slider.value),
        chessCols: Math.round(paramBlocks.chessCols.slider.value),
        hexSize: Math.round(paramBlocks.hexSize.slider.value),
        ovalCount: Math.round(paramBlocks.ovalCount.slider.value),
        puzzleRows: Math.round(paramBlocks.puzzleRows.slider.value),
        puzzleCols: Math.round(paramBlocks.puzzleCols.slider.value),
        puzzleOutline: chkPuzzleOutline.value,
        puzzleStrips: Math.round(paramBlocks.puzzleStrips.slider.value),
        puzzle1DOrientation: ddPuzzleStripOrientation.selection.index,
        puzzle1DOutline: chkPuzzle1DOutline.value,
        radialSectors: Math.round(paramBlocks.radialSectors.slider.value),
        spiralBands: Math.round(paramBlocks.spiralBands.slider.value),
        spiralAngle: Math.round(paramBlocks.spiralAngle.slider.value),
        sunbeamBeams: Math.round(paramBlocks.sunbeamBeams.slider.value),
        waveCount: Math.round(paramBlocks.waveCount.slider.value),
        shadowEnable: chkShadowEnable.value,
        shadowOpacity: Math.round(paramBlocks.shadowOpacity.slider.value),
        shadowDistance: Math.round(paramBlocks.shadowDistance.slider.value),
        shadowBlur: Math.round(paramBlocks.shadowBlur.slider.value),
        shadowR: parseInt(txtShadowR.text, 10),
        shadowG: parseInt(txtShadowG.text, 10),
        shadowB: parseInt(txtShadowB.text, 10),
        outputType: ddOutputType.selection.index,
        outputQuality: txtOutputQuality.text,
        showPreview: chkShowPreview.value,
        keepPreview: chkKeepPreview.value,
        logging: chkLogging.value
    };
}
function applySettingsToGUI(s) {
    ddPattern.selection = s.pattern;
    paramBlocks.horizontal.slider.value = s.horizontalSlices;
    paramBlocks.vertical.slider.value = s.verticalSlices;
    paramBlocks.diagonal.slider.value = s.diagonalSlices;
    paramBlocks.triangle.slider.value = s.triangleSlices;
    paramBlocks.chessRows.slider.value = s.chessRows;
    paramBlocks.chessCols.slider.value = s.chessCols;
    paramBlocks.hexSize.slider.value = s.hexSize;
    paramBlocks.ovalCount.slider.value = s.ovalCount;
    paramBlocks.puzzleRows.slider.value = s.puzzleRows;
    paramBlocks.puzzleCols.slider.value = s.puzzleCols;
    chkPuzzleOutline.value = s.puzzleOutline;
    paramBlocks.puzzleStrips.slider.value = s.puzzleStrips;
    ddPuzzleStripOrientation.selection = s.puzzle1DOrientation;
    chkPuzzle1DOutline.value = s.puzzle1DOutline;
    paramBlocks.radialSectors.slider.value = s.radialSectors;
    paramBlocks.spiralBands.slider.value = s.spiralBands;
    paramBlocks.spiralAngle.slider.value = s.spiralAngle;
    paramBlocks.sunbeamBeams.slider.value = s.sunbeamBeams;
    paramBlocks.waveCount.slider.value = s.waveCount;
    chkShadowEnable.value = s.shadowEnable;
    paramBlocks.shadowOpacity.slider.value = s.shadowOpacity;
    paramBlocks.shadowDistance.slider.value = s.shadowDistance;
    paramBlocks.shadowBlur.slider.value = s.shadowBlur;
    txtShadowR.text = s.shadowR;
    txtShadowG.text = s.shadowG;
    txtShadowB.text = s.shadowB;
    ddOutputType.selection = s.outputType;
    txtOutputQuality.text = String(s.outputQuality);
    chkShowPreview.value = s.showPreview;
    chkKeepPreview.value = s.keepPreview;
    chkLogging.value = s.logging;
    updateShadowColorPreview();
    updateParamGroups();
}

// === [ DEFAULT SETTINGS ] ===
var defaultSettings = {
    pattern: 0,
    horizontalSlices: 10,
    verticalSlices: 10,
    diagonalSlices: 10,
    triangleSlices: 12,
    chessRows: 8,
    chessCols: 8,
    hexSize: 48,
    ovalCount: 7,
    puzzleRows: 5,
    puzzleCols: 5,
    puzzleOutline: true,
    puzzleStrips: 8,
    puzzle1DOrientation: 0,
    puzzle1DOutline: true,
    radialSectors: 16,
    spiralBands: 12,
    spiralAngle: 90,
    sunbeamBeams: 16,
    waveCount: 8,
    shadowEnable: false,
    shadowOpacity: 80,
    shadowDistance: 8,
    shadowBlur: 10,
    shadowR: 0,
    shadowG: 0,
    shadowB: 0,
    outputType: 0,
    outputQuality: "12",
    showPreview: true,
    keepPreview: false,
    logging: true
};

// === [ GENERA NOME FILE OUTPUT ] ===
function generateOutputFileName(patternName) {
    var now = new Date();
    var y = now.getFullYear();
    var m = ("0" + (now.getMonth()+1)).slice(-2);
    var d = ("0" + now.getDate()).slice(-2);
    var hh = ("0" + now.getHours()).slice(-2);
    var mm = ("0" + now.getMinutes()).slice(-2);
    var ss = ("0" + now.getSeconds()).slice(-2);
    var base = "TSP_" + y + m + d + "_" + hh + mm + ss + "_" + patternName.replace(/[\s\(\)]/g, "");
    return base;
}

// === [ PROGRESS WINDOW ] ===
function showProgressWindow(title, maxValue) {
    var win = new Window("palette", title, undefined, {closeButton: false});
    win.orientation = "column";
    win.alignChildren = "fill";
    var bar = win.add("progressbar", undefined, 0, maxValue);
    bar.preferredSize.width = 260;
    var txt = win.add("statictext", undefined, "In progress...");
    win.show();
    return {
        update: function(val, msg) {
            bar.value = val;
            if (msg) txt.text = msg;
        },
        close: function() { win.close(); }
    };
}

// === [ LOGGING ] ===
function log(msg) {
    if (chkLogging && chkLogging.value) {
        $.writeln("[TSP] " + msg);
    }
}

// === [ UTILITY: SAFE PARSE ] ===
function safeInt(val, def) {
    var n = parseInt(val, 10);
    return isNaN(n) ? def : n;
}

// === [ GESTIONE ESC / INTERRUPT – SCAFFOLD ] ===
// (Da collegare al ciclo rendering, per ora variabile globale)
var TSP_USER_INTERRUPT = false;
function checkUserInterrupt() {
    // TODO: implementare, ad esempio con tastiera o pulsante dedicato
    return TSP_USER_INTERRUPT;
}

// === [ COLLEGA I BOTTONI DELLA GUI ] ===
btnSaveSettings.onClick = function() {
    var f = File.saveDialog("Save TSP settings...", "*.json");
    if (f) saveSettingsToFile(f.fsName);
};
btnLoadSettings.onClick = function() {
    var f = File.openDialog("Load TSP settings...", "*.json");
    if (f) loadSettingsFromFile(f.fsName);
};
btnResetSettings.onClick = function() {
    resetSettings();
};

// === [ FINE BLOCCO 5 ] ===
// ====================================================================
// === TimeSlicerPro v26.05 – BLOCCO 6: EXTRA UTILITY & SPECIALS      ====
// ====================================================================

// === [ DIRECTORY SELECTION & IMAGE COUNTER ] ===
btnSelectSourceDir.onClick = function() {
    var folder = Folder.selectDialog("Select source image folder");
    if (folder) {
        txtSourceDir.text = folder.fsName;
        updateImageCount(folder);
    }
};
btnSelectDestDir.onClick = function() {
    var folder = Folder.selectDialog("Select destination folder");
    if (folder) txtDestDir.text = folder.fsName;
};
function updateImageCount(folder) {
    var exts = ["jpg","jpeg","png","tif","tiff","bmp","psd"];
    var files = folder.getFiles(function(f) {
        if (f instanceof File) {
            var ext = f.name.split('.').pop().toLowerCase();
            return exts.indexOf(ext) != -1;
        }
        return false;
    });
    lblImgCount.text = "" + files.length;
}

// === [ FILE TYPE LOGIC: JPEG/PNG/TIFF + QUALITY HANDLING ] ===
ddOutputType.onChange = function() {
    var type = ddOutputType.selection.text;
    txtOutputQuality.enabled = (type == "JPG");
};

// === [ AUTO-GENERA NOME FILE OUTPUT ] ===
function updateOutputFileName() {
    var patternName = ddPattern.selection.text || "Pattern";
    txtOutputFile.text = generateOutputFileName(patternName);
}
ddPattern.onChange = updateOutputFileName;
btnRun.onClick = updateOutputFileName;

// === [ ANTI-INPUT DUPLICATION / UI LOCK DURING RUN ] ===
function lockGUI() {
    myWin.enabled = false;
}
function unlockGUI() {
    myWin.enabled = true;
}

// === [ SINCRONIZZAZIONE SLIDER <-> NUMERIC BOX ] ===
function syncSliderNumeric(slider, numeric) {
    slider.onChanging = function () { numeric.text = Math.round(slider.value); };
    numeric.onChanging = function () { var v = parseInt(numeric.text, 10); if (!isNaN(v)) slider.value = v; };
}

// === [ TEXTBOX SOLO NUMERI ] ===
function enforceNumeric(box, min, max) {
    box.addEventListener('keydown', function(k) {
        if ((k.keyName < "0" || k.keyName > "9") && k.keyName != "Backspace" && k.keyName != "Delete" && k.keyName != "Left" && k.keyName != "Right") {
            k.preventDefault();
        }
    });
    box.onChange = function() {
        var v = parseInt(box.text, 10);
        if (isNaN(v)) v = min;
        if (v < min) v = min; if (v > max) v = max;
        box.text = v;
    };
}

// === [ SHORTCUT DA TASTIERA: ESC = CANCEL ] ===
myWin.addEventListener('keydown', function(k) {
    if (k.keyName == "Escape") { myWin.close(); }
});

// === [ TOOLTIP SUI PARAMETRI ] ===
function setParamTooltip(group, tip) {
    for (var i=0; i<group.children.length; i++) {
        if (group.children[i].type == "edittext" || group.children[i].type == "slider") {
            group.children[i].helpTip = tip;
        }
    }
}

// Esempio uso:
// setParamTooltip(gHorizontal, "Number of horizontal bands");

// === [ FOCUS SUL PRIMO CAMPO UTILE ] ===
function focusOnFirst() {
    try { txtSourceDir.active = true; } catch (e) {}
}
myWin.onShow = focusOnFirst;

// === [ MESSAGGIO DI AVVISO SE MANCANO CAMPI OBBLIGATORI ] ===
function checkRequiredFields() {
    if (!txtSourceDir.text) {
        alert("Select an image source folder");
        return false;
    }
    if (!txtDestDir.text) {
        alert("Select a destination folder!");
        return false;
    }
    return true;
}
btnRun.onClick = function() {
    // 1. Controlla campi obbligatori (cartella sorgente e destinazione)
    if (!checkRequiredFields()) return;
    lockGUI();

    try {
        // 2. Raccogli parametri comuni e specifici
        var params = {};

        // Parametri comuni (esempio: shadow, output, logging, ecc.)
        params.shadow = {
            enabled: chkShadowEnable.value,
            opacity: Math.round(paramBlocks.shadowOpacity.slider.value),
            distance: Math.round(paramBlocks.shadowDistance.slider.value),
            blur: Math.round(paramBlocks.shadowBlur.slider.value),
            color: [
                safeInt(txtShadowR.text, 0),
                safeInt(txtShadowG.text, 0),
                safeInt(txtShadowB.text, 0)
            ]
        };
        params.output = {
            type: ddOutputType.selection.text,
            quality: safeInt(txtOutputQuality.text, 12),
            file: txtOutputFile.text
        };
        params.logging = chkLogging.value;
        params.sourceDir = txtSourceDir.text;
        params.destDir = txtDestDir.text;

        // 3. Dispatcher: pattern-specific
        switch (ddPattern.selection.text) {
            case "Horizontal (Top to Bottom)":
            case "Horizontal (Bottom to Top)":
                params.slices = Math.round(paramBlocks.horizontal.slider.value);
                runHorizontalSlices(params);
                break;
            case "Vertical (Left to Right)":
            case "Vertical (Right to Left)":
                params.slices = Math.round(paramBlocks.vertical.slider.value);
                runVerticalSlices(params);
                break;
            case "Diagonal (Main)":
            case "Diagonal (Anti)":
                params.slices = Math.round(paramBlocks.diagonal.slider.value);
                runDiagonalSlices(params);
                break;
            case "Triangle":
                params.slices = Math.round(paramBlocks.triangle.slider.value);
                runTriangleSlices(params);
                break;
            case "Chessboard":
                params.rows = Math.round(paramBlocks.chessRows.slider.value);
                params.cols = Math.round(paramBlocks.chessCols.slider.value);
                runChessboard(params);
                break;
            case "HexGrid":
                params.hexSize = Math.round(paramBlocks.hexSize.slider.value);
                runHexGrid(params);
                break;
            case "Oval":
                params.ovals = Math.round(paramBlocks.ovalCount.slider.value);
                runOval(params);
                break;
            case "Puzzle (2D)":
                params.rows = Math.round(paramBlocks.puzzleRows.slider.value);
                params.cols = Math.round(paramBlocks.puzzleCols.slider.value);
                params.outline = chkPuzzleOutline.value;
                runPuzzle2D(params);
                break;
            case "Puzzle Strip (1D)":
                params.strips = Math.round(paramBlocks.puzzleStrips.slider.value);
                params.orientation = ddPuzzleStripOrientation.selection.text;
                params.outline = chkPuzzle1DOutline.value;
                runPuzzle1D(params);
                break;
            case "Radial":
                params.sectors = Math.round(paramBlocks.radialSectors.slider.value);
                runRadial(params);
                break;
			case "Spiral":
				params.bands = Math.round(txtSpiralBands.text);
				params.angle = Math.round(txtSpiralAngle.text);
				params.direction = ddSpiralDirection.selection.text; // "Inside to Outside" o "Outside to Inside"
				runSpiral(params);
				break;
			case "Sunbeam":
				params.beams = Math.round(txtSunbeamBeams.text);
				params.direction = ddSunbeamDirection.selection.text;
				runSunbeam(params);
				break;
            case "Wave":
                params.waves = Math.round(paramBlocks.waveCount.slider.value);
                runWave(params);
                break;
            default:
                alert("Pattern non riconosciuto!");
        }
    } catch (err) {
        alert("Errore durante l'esecuzione:\n" + err.toString());
        if (params && params.logging) log("Errore: " + err.toString());
    } finally {
        unlockGUI();
    }
};

// === [ FINE BLOCCO 6 ] ===
// =====================================================================
// === TimeSlicerPro v26.05 – BLOCCO 7: BATCH, ERROR, STATS, DEBUG     ====
// =====================================================================

// === [ BATCH PROCESSING: ELABORA TUTTE LE IMMAGINI DELLA CARTELLA ] ===
function runBatchOnFolder(params, renderFunction) {
    if (!params.sourceDir || !params.destDir) {
        alert("Folders not selected!");
        return;
    }
    var folder = new Folder(params.sourceDir);
    var exts = ["jpg","jpeg","png","tif","tiff","bmp","psd"];
    var files = folder.getFiles(function(f) {
        if (f instanceof File) {
            var ext = f.name.split('.').pop().toLowerCase();
            return exts.indexOf(ext) != -1;
        }
        return false;
    });
    if (!files || files.length === 0) {
        alert("Nessuna immagine trovata nella cartella selezionata!");
        return;
    }

    // === Statistiche batch ===
    var nFiles = files.length;
    var nOk = 0, nFail = 0, errors = [];
    var t0 = new Date().getTime();

    var progress = showProgressWindow("Processing batch...", nFiles);

    for (var i=0; i<files.length; i++) {
        var file = files[i];
        var msg = "File " + (i+1) + "/" + nFiles + ": " + file.name;
        progress.update(i, msg);

        try {
            if (TSP_USER_INTERRUPT) {
                errors.push("Interrotto dall’utente dopo " + i + " file.");
                break;
            }
            // Carica immagine, prepara parametri specifici per il file corrente
            params.currentFile = file;
            // renderFunction è la funzione di slicing effettivo (es. runHorizontalSlices)
            renderFunction(params);
            nOk++;
        } catch (err) {
            nFail++;
            errors.push(file.name + ": " + err.toString());
            if (params.logging) log("Errore su " + file.name + ": " + err.toString());
        }
    }
    progress.close();

    var t1 = new Date().getTime();
    var sec = ((t1-t0)/1000).toFixed(2);

    // === Statistiche finali ===
    var report = "Batch completato!\n";
    report += "Successi: " + nOk + "/" + nFiles + "\n";
    report += "Errori: " + nFail + "\n";
    report += "Tempo: " + sec + " sec.\n";
    if (errors.length > 0) report += "\nErrori:\n" + errors.join("\n");
    alert(report);

    if (params.logging) {
        log("[BATCH] " + report.replace(/\n/g," | "));
        if (errors.length > 0) log("[BATCH/ERRORS] " + errors.join(" || "));
    }
}

// === [ DEBUG UTILITY: DUMP PARAMETRI ] ===
function dumpParams(params) {
    var txt = "";
    for (var k in params) {
        if (typeof params[k] === "object") txt += k + ": " + JSON.stringify(params[k]) + "\n";
        else txt += k + ": " + params[k] + "\n";
    }
    log("[PARAMS DUMP]\n" + txt);
}

// === [ GANCHI FUTURI: CALLBACK, ABORT, HOOKS ] ===
function onBatchStart(params) {
    // Hook personalizzabile, es: log inizio process, init risorse, ecc.
    log("Inizio batch su " + params.sourceDir + " (" + params.pattern + ")");
}
function onBatchEnd(params, stats) {
    // Hook personalizzabile, es: log fine, cleanup, analisi, ecc.
    log("Fine batch: " + JSON.stringify(stats));
}
function abortBatch() {
    TSP_USER_INTERRUPT = true;
}

// === [ ESEMPIO USO: NEL DISPATCHER ] ===
// Sostituisci la chiamata diretta a runHorizontalSlices(params) con:
/*
runBatchOnFolder(params, runHorizontalSlices); // or runChessboard, ecc.
*/

// === [ FINE BLOCCO 7 ] ===
// ====================================================================
// === TimeSlicerPro v26.05 – BLOCCO 8: PARAMETRI DINAMICI & PRESET   ====
// ====================================================================

// === [ MOSTRA SOLO I PARAMETRI DEL PATTERN SELEZIONATO ] ===
function showOnlyParamGroup(pattern) {
    // Mappa pattern -> gruppo parametri (aggiungi qui tutti i gruppi che hai)
    var groupMap = {
        "Horizontal (Top to Bottom)": gHorizontal,
        "Horizontal (Bottom to Top)": gHorizontal,
        "Vertical (Left to Right)": gVertical,
        "Vertical (Right to Left)": gVertical,
        "Diagonal (Main)": gDiagonal,
        "Diagonal (Anti)": gDiagonal,
        "Triangle": gTriangle,
        "Chessboard": gChessboard,
        "HexGrid": gHexGrid,
        "Oval": gOval,
        "Puzzle (2D)": gPuzzle2d,
        "Puzzle Strip (1D)": gPuzzle1d,
        "Radial": gRadial,
        "Spiral": gSpiral,
        "Sunbeam": gSunbeam,
        "Wave": gWave
        // ...aggiungi altri pattern qui...
    };
    // Nascondi tutti
    for (var key in groupMap) { groupMap[key].visible = false; }
    // Mostra solo il gruppo giusto
    if (groupMap[pattern]) groupMap[pattern].visible = true;
}

// === [ AGGIORNA PARAMETRI VISIBILI ALLA SELEZIONE DEL PATTERN ] ===
ddPattern.onChange = function() {
    showOnlyParamGroup(ddPattern.selection.text);
    updateOutputFileName();
};

// === [ GESTIONE PRESET: SALVA/RECUPERA CONFIGURAZIONE ] ===
function savePresetToFile() {
    var preset = collectAllParams();
    var file = File.saveDialog("Save preset as JSON", "*.json");
    if (file) {
        file.open("w");
        file.write(JSON.stringify(preset, null, 2));
        file.close();
        alert("Preset salvato!");
    }
}
function loadPresetFromFile() {
    var file = File.openDialog("Open preset JSON", "*.json");
    if (file) {
        file.open("r");
        var content = file.read();
        file.close();
        try {
            var preset = JSON.parse(content);
            applyParamsToUI(preset);
            alert("Preset caricato!");
        } catch (e) {
            alert("Preset non valido!");
        }
    }
}

// === [ COLLEZIONA TUTTI I PARAMETRI DELLA UI ] ===
function collectAllParams() {
    return {
        pattern: ddPattern.selection.text,
        horizontalSlices: txtHorizontalSlices.text,
        verticalSlices: txtVerticalSlices.text,
        diagonalSlices: txtDiagonalSlices.text,
        triangleSlices: txtTriangleSlices.text,
        chessRows: txtChessRows.text,
        chessCols: txtChessCols.text,
        hexSize: txtHexSize.text,
        ovalCount: txtOvalCount.text,
        puzzleRows: txtPuzzleRows.text,
        puzzleCols: txtPuzzleCols.text,
        puzzleOutline: chkPuzzleOutline.value,
        puzzleStrips: txtPuzzleStrips.text,
        puzzle1DOrientation: ddPuzzleStripOrientation.selection ? ddPuzzleStripOrientation.selection.text : "",
        puzzle1DOutline: chkPuzzle1DOutline.value,
        radialSectors: txtRadialSectors.text,
        spiralBands: txtSpiralBands.text,
        spiralAngle: txtSpiralAngle.text,
        spiralDirection: ddSpiralDirection.selection ? ddSpiralDirection.selection.text : "",
        sunbeamBeams: txtSunbeamBeams.text,
        sunbeamDirection: ddSunbeamDirection.selection ? ddSunbeamDirection.selection.text : "",
        waveCount: txtWaveCount.text,
        sourceDir: txtSourceDir.text,
        destDir: txtDestDir.text,
        outputType: ddOutputType.selection.text,
        outputQuality: txtOutputQuality.text,
        outputFile: txtOutputFile.text,
        shadowEnable: chkShadowEnable.value,
        shadowOpacity: paramBlocks.shadowOpacity.slider.value,
        shadowDistance: paramBlocks.shadowDistance.slider.value,
        shadowBlur: paramBlocks.shadowBlur.slider.value,
        shadowR: txtShadowR.text,
        shadowG: txtShadowG.text,
        shadowB: txtShadowB.text,
        logging: chkLogging.value
        // ...aggiungi altri parametri qui se necessario...
    };
}

// === [ APPLICA UN PRESET AI CAMPI DELLA UI ] ===
function applyParamsToUI(preset) {
    // Esempio: aggiorna solo i parametri che sono presenti
    if (preset.pattern) ddPattern.selection = ddPattern.find(preset.pattern);
    if (preset.horizontalSlices) txtHorizontalSlices.text = preset.horizontalSlices;
    if (preset.verticalSlices) txtVerticalSlices.text = preset.verticalSlices;
    if (preset.diagonalSlices) txtDiagonalSlices.text = preset.diagonalSlices;
    if (preset.triangleSlices) txtTriangleSlices.text = preset.triangleSlices;
    if (preset.chessRows) txtChessRows.text = preset.chessRows;
    if (preset.chessCols) txtChessCols.text = preset.chessCols;
    if (preset.hexSize) txtHexSize.text = preset.hexSize;
    if (preset.ovalCount) txtOvalCount.text = preset.ovalCount;
    if (preset.puzzleRows) txtPuzzleRows.text = preset.puzzleRows;
    if (preset.puzzleCols) txtPuzzleCols.text = preset.puzzleCols;
    if (typeof(preset.puzzleOutline)!="undefined") chkPuzzleOutline.value = preset.puzzleOutline;
    if (preset.puzzleStrips) txtPuzzleStrips.text = preset.puzzleStrips;
    if (preset.puzzle1DOrientation) ddPuzzleStripOrientation.selection = ddPuzzleStripOrientation.find(preset.puzzle1DOrientation);
    if (typeof(preset.puzzle1DOutline)!="undefined") chkPuzzle1DOutline.value = preset.puzzle1DOutline;
    if (preset.radialSectors) txtRadialSectors.text = preset.radialSectors;
    if (preset.spiralBands) txtSpiralBands.text = preset.spiralBands;
    if (preset.spiralAngle) txtSpiralAngle.text = preset.spiralAngle;
    if (preset.spiralDirection) ddSpiralDirection.selection = ddSpiralDirection.find(preset.spiralDirection);
    if (preset.sunbeamBeams) txtSunbeamBeams.text = preset.sunbeamBeams;
    if (preset.sunbeamDirection) ddSunbeamDirection.selection = ddSunbeamDirection.find(preset.sunbeamDirection);
    if (preset.waveCount) txtWaveCount.text = preset.waveCount;
    if (preset.sourceDir) txtSourceDir.text = preset.sourceDir;
    if (preset.destDir) txtDestDir.text = preset.destDir;
    if (preset.outputType) ddOutputType.selection = ddOutputType.find(preset.outputType);
    if (preset.outputQuality) txtOutputQuality.text = preset.outputQuality;
    if (preset.outputFile) txtOutputFile.text = preset.outputFile;
    if (typeof(preset.shadowEnable)!="undefined") chkShadowEnable.value = preset.shadowEnable;
    if (typeof(preset.shadowOpacity)!="undefined") paramBlocks.shadowOpacity.slider.value = preset.shadowOpacity;
    if (typeof(preset.shadowDistance)!="undefined") paramBlocks.shadowDistance.slider.value = preset.shadowDistance;
    if (typeof(preset.shadowBlur)!="undefined") paramBlocks.shadowBlur.slider.value = preset.shadowBlur;
    if (preset.shadowR) txtShadowR.text = preset.shadowR;
    if (preset.shadowG) txtShadowG.text = preset.shadowG;
    if (preset.shadowB) txtShadowB.text = preset.shadowB;
    if (typeof(preset.logging)!="undefined") chkLogging.value = preset.logging;
    // ...aggiungi altri parametri se servono...
    showOnlyParamGroup(ddPattern.selection.text);
}

// === [ AGGIUNGI BOTTONI PRESET ALLA UI ] ===
var gPreset = myWin.add("group");
var btnSavePreset = gPreset.add("button", undefined, "Salva Preset");
var btnLoadPreset = gPreset.add("button", undefined, "Carica Preset");
btnSavePreset.onClick = savePresetToFile;
btnLoadPreset.onClick = loadPresetFromFile;

// === [ INIZIALIZZAZIONE DEFAULT: MOSTRA SOLO I PARAMETRI DEL PATTERN DEFAULT ] ===
showOnlyParamGroup(ddPattern.selection.text);

// === [ FINE BLOCCO 8 ] ===
// =====================================================================
// === TimeSlicerPro v26.05 – BLOCCO 9: HELP, ABOUT, TOOLTIP, DOCS     ====
// =====================================================================

// === [ TOOLTIP & HELP POPUP ] ===
function addTooltipToControl(ctrl, tip) {
    if (ctrl && ctrl.properties) ctrl.helpTip = tip;
}

// Esempio di uso: addTooltipToControl(txtHorizontalSlices, "Numero di bande orizzontali");
// Chiamalo per ogni controllo che vuoi dotare di tooltip.

function showHelp() {
    var msg = "TimeSlicerPro - Aiuto rapido\n\n" +
        "- Seleziona la cartella sorgente e quella di destinazione.\n" +
        "- Scegli il pattern di suddivisione (bande, scacchiera, puzzle, ecc).\n" +
        "- Imposta i parametri del pattern scelto (es: numero di bande, righe, colonne).\n" +
        "- (Opzionale) Regola le opzioni di Shadow, Output, ecc.\n" +
        "- Premi 'Run' per avviare il processing.\n" +
        "- Puoi salvare/caricare preset di configurazione.\n\n" +
        "Per info dettagliate consulta la documentazione (link in basso).";
    alert(msg);
}

function showAbout() {
    var msg = "TimeSlicerPro v26.05\n" +
        "Autore: CapZicco & Copilot\n" +
        "© 2025 - Tutti i diritti riservati.\n\n" +
        "Script avanzato per il batch slicing grafico in Photoshop/ExtendScript.\n\n" +
        "GitHub: https://github.com/CapZicco/TimeSlicerPro\n" +
        "Per supporto, suggerimenti o segnalazione bug, contattaci su GitHub!";
    alert(msg);
}

// === [ AGGIUNGI BOTTONI HELP/ABOUT ALLA UI ] ===
var gHelp = myWin.add("group");
var btnHelp = gHelp.add("button", undefined, "Aiuto");
var btnAbout = gHelp.add("button", undefined, "About");
btnHelp.onClick = showHelp;
btnAbout.onClick = showAbout;

// === [ TOOLTIP PER I CONTROLLI PRINCIPALI ] ===
// (Chiamali dopo aver creato tutti i controlli)
addTooltipToControl(txtSourceDir, "Cartella delle immagini di input");
addTooltipToControl(txtDestDir, "Cartella dove verranno salvati i risultati");
addTooltipToControl(ddPattern, "Scegli il pattern di suddivisione");
addTooltipToControl(btnRun, "Avvia il batch processing");
addTooltipToControl(btnSavePreset, "Salva la configurazione corrente su file");
addTooltipToControl(btnLoadPreset, "Carica una configurazione salvata");
// ...aggiungi altri tooltip per i controlli specifici...

// === [ FINE BLOCCO 9 ] ===
// =====================================================================
// === TimeSlicerPro v26.05 – BLOCCO 10: ESTENDIBILITÀ, HOOKS, PLUGIN  ====
// =====================================================================

// === [ HOOKS PER ESTENSIONI/FUNZIONI FUTURE ] ===
// Puoi usare questi hook per collegare nuove feature senza toccare il core.

var TSP_Hooks = {
    // Chiamato prima di processare ogni file (ritorna false per skippare)
    beforeProcessFile: function(params) { return true; },

    // Chiamato dopo aver processato ogni file
    afterProcessFile: function(params, result) {},

    // Chiamato all’inizio di ogni batch
    onBatchStart: function(batchParams) {},

    // Chiamato alla fine del batch
    onBatchEnd: function(batchParams, stats) {},

    // Chiamato se c’è un errore bloccante
    onError: function(err, context) {}
};

// === [ ESEMPIO USO: INTEGRAZIONE NEI PUNTI CHIAVE ] ===
function runBatchOnFolder(params, renderFunction) {
    params = params || {};
    if (TSP_Hooks.onBatchStart) TSP_Hooks.onBatchStart(params);
    // ...
}

    // ... codice standard batch ...
    for (var i=0; i<files.length; i++) {
        var file = files[i];
        params.currentFile = file;
        // --- Hook: prima di processare il file
        if (TSP_Hooks.beforeProcessFile && !TSP_Hooks.beforeProcessFile(params)) continue;

        try {
            renderFunction(params);
            if (TSP_Hooks.afterProcessFile) TSP_Hooks.afterProcessFile(params, {ok:true});
        } catch (err) {
            if (TSP_Hooks.onError) TSP_Hooks.onError(err, {file:file, params:params});
            if (TSP_Hooks.afterProcessFile) TSP_Hooks.afterProcessFile(params, {ok:false, error:err});
        }
    }
    if (TSP_Hooks.onBatchEnd) TSP_Hooks.onBatchEnd(params /*, stats opzionali */);


// === [ PLUGIN SYSTEM: ESEMPIO SEMPLICE ] ===
var TSP_Plugins = [];
function registerTSPPlugin(pluginObj) {
    TSP_Plugins.push(pluginObj);
    // Facoltativo: chiama init
    if (pluginObj.init) pluginObj.init();
}

// Esempio di plugin: log extra su ogni file
registerTSPPlugin({
    name: "LoggerPlus",
    afterProcessFile: function(params, result) {
        if (result.ok) log("[PLUGIN][OK] " + params.currentFile.name);
        else log("[PLUGIN][ERR] " + params.currentFile.name + ": " + result.error);
    }
});

// All’interno di ogni hook, puoi ciclare tutti i plugin:
function callPluginHook(hookName, args) {
    for (var i=0; i<TSP_Plugins.length; i++) {
        var plugin = TSP_Plugins[i];
        if (plugin[hookName]) plugin[hookName].apply(plugin, args);
    }
}

// Puoi sostituire gli hook principali così:
if (TSP_Hooks.onBatchStart) TSP_Hooks.onBatchStart(params || {});
callPluginHook("onBatchStart", [params]);

// === [ FINE BLOCCO 10 ] ===