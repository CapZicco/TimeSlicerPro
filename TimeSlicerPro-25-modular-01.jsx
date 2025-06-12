/*
 * TimeSlicerPro v25.1 [GUI compatta, Preview Universale, Wireframe selezionabile]
 * CapZicco & Amiga Lovers
 * Features:
 * - GUI compatta, ridimensionabile e autoadattiva ai pattern scelti
 * - Anteprima wireframe universale per tutti i pattern con 1 click (chiude GUI e riapre)
 * - Opzione “Mantieni wireframe nel risultato” selezionabile per ogni funzione
 * - Voronoi **RIMOSSO** (codice pronto per reinserimento, se richiesto)
 * - Codice ampiamente commentato e pulito
 */

// === FLAG GLOBALE ESC ===
var TSP_USER_INTERRUPT = false;

// === VERSION CHECK ===
function getPSVersion() {
    try { return app.version ? app.version : "unknown"; }
    catch(e) { return "unknown"; }
}
function warnIfUnsupported() {
    var version = getPSVersion();
    var major = parseInt(version.split(".")[0], 10);
    if (major < 22) {
        alert("Please note: only tested on Photoshop v22+.\nCurrent version: " + version);
    }
}


// === VERSIONE, SETTINGS, LOG, UTILS, PATH ===
var TSP_VERSION = "v25.1";
var settingsPath = '~/Documents/tsp/TSP-LastSettingsUsed.txt';

// ----- SETTINGS DI DEFAULT + AGGIORNAMENTI per wireframe e preview -----
function getDefaults() {
    return {
        inputFolder: "~",
        outputFolder: "~",
        outputFile: "output",
        outputType: "jpg",
        outputPattern: "Vertical Slices Left To Right",
        outputQuality: 12,
        // Pattern options
        shadow: "no",
        shadowOpacity: 10,
        shadowDist: 5,
        shadowSpread: 0,
        shadowSize: 5,
        shadowAngle: 120,
        shadowColor: "#000000",
        radialOrder: "center",
        stripeTwist: 4,
        spiralStripesNum: 12,
        gridRows: 3,
        gridCols: 3,
        triangleSide: 150,
        triangleGap: 0,
        // Puzzle
        puzzleRows: 0,
        puzzleCols: 0,
        // --- Universale ---
        keepWireframe: false,   // Se spuntato: il wireframe resta anche nell'output finale
        generateLog: false
    };
}

// ----- Caricamento e salvataggio settings -----
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

// ----- UTILS Vari -----
function getNowTimestamp() {
    var now = new Date();
    return now.getFullYear().toString() + "-" +
        ("0" + (now.getMonth() + 1)).slice(-2) + "-" +
        ("0" + now.getDate()).slice(-2) + "_" +
        ("0" + now.getHours()).slice(-2) + "-" +
        ("0" + now.getMinutes()).slice(-2) + "-" +
        ("0" + now.getSeconds()).slice(-2);
}
function filesOpenCount() { return app.documents.length; }
function fileExist(fileWithPath) { return File(fileWithPath).exists; }
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
function closeFile(fileRef, mode) {
    switch (mode) {
        case "save": fileRef.close(SaveOptions.SAVECHANGES); break;
        case "nosave": fileRef.close(SaveOptions.DONOTSAVECHANGES); break;
        case "prompt":
        default: fileRef.close(SaveOptions.PROMPTTOSAVECHANGES); break;
    }
}
function makeFilePath(folder, fileName, ext) {
    var sep = ($.os.toLowerCase().indexOf("windows") !== -1) ? "\\" : "/";
    var path = folder;
    if (!path.match(/[\/\\]$/)) path += sep;
    path += fileName;
    if (ext) {
        if (ext[0] !== ".") ext = "." + ext;
        path += ext.toLowerCase();
    }
    return path.replace(/\/{2,}/g, "/").replace(/\\{2,}/g, "\\");
}
function getMyFiles(sourceFolder, extList) {
    var fileArray = [];
    var t = Folder(sourceFolder);
    if (!t.exists) return fileArray;
    var docs = t.getFiles().sort();
    var len = docs.length;
    for (var i = 0; i < len; i++) {
        var doc = docs[i];
        if (doc instanceof File) {
            var docName = doc.name;
            if (docName.match(eval(extList))) {
                fileArray.push(doc);
            }
        }
    }
    return fileArray;
}
function saveImage(doc, settings) {
    var ext = settings.outputType.toLowerCase();
    if (ext.charAt(0) !== ".") ext = "." + ext;
    var timestamp = getNowTimestamp();
    var patt = (settings.outputPattern || "").replace(/[^A-Za-z]+/g,"_").replace(/^_+|_+$/g,"").toUpperCase();
    var fileNameWithTs = settings.outputFile + "_" + TSP_VERSION + "_" + timestamp + (patt ? "_" + patt : "");
    var path = makeFilePath(settings.outputFolder, fileNameWithTs, ext);
    var fileObj = new File(path);
    if (ext === ".jpg" || ext === ".jpeg") {
        var jpegOptions = new JPEGSaveOptions();
        jpegOptions.quality = settings.outputQuality || 12;
        jpegOptions.embedColorProfile = true;
        doc.saveAs(fileObj, jpegOptions, true);
    } else if (ext === ".png") {
        var opts = new PNGSaveOptions();
        opts.format = SaveDocumentType.PNG;
        opts.transparency = true;
        opts.PNGB = false;
        opts.quality = 100;
        opts.includeProfile = true;
        doc.saveAs(fileObj, opts, true, Extension.LOWERCASE);
    } else {
        throw new Error("Unsupported format for saveImage: " + ext);
    }
    return path;
}
function duplicateLayersInto(targetDoc) {
    for (var z = app.activeDocument.artLayers.length - 1; z >= 0; z--) {
        var al = app.activeDocument.artLayers[z];
        al.duplicate(targetDoc, ElementPlacement.PLACEATEND);
    }
}
function writeLog(msg, outputFolder, enabled) {
    if (!enabled) return;
    var currentdate = new Date();
    var datetime = currentdate.getDate() + "/" + (currentdate.getMonth() + 1) + "/" + currentdate.getFullYear() + "@" +
        currentdate.getHours() + ":" + currentdate.getMinutes() + ":" + currentdate.getSeconds();
    var txtFile = new File(outputFolder + "/log.txt");
    txtFile.open("a");
    txtFile.writeln(TSP_VERSION + " | " + datetime + ": " + msg);
    txtFile.close();
}

// === Universal Wireframe Preview ===
// ==========================================================
// === MASKING & SELECTION UTILS (rettangoli, poligoni, griglie)
// ==========================================================

var cTID = function (s) { return app.charIDToTypeID(s); };
var sTID = function (s) { return app.stringIDToTypeID(s); };

function selectRect(x1, y1, x2, y2) {
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
}

function selectPolygon(points) {
    if (!points || points.length < 3) return;
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putProperty(cTID("Chnl"), sTID("selection"));
    desc.putReference(cTID("null"), ref);
    var polyDesc = new ActionDescriptor();
    var list = new ActionList();
    for (var p = 0; p < points.length; p++) {
        var ptDesc = new ActionDescriptor();
        ptDesc.putUnitDouble(cTID("Hrzn"), cTID("#Pxl"), points[p][0]);
        ptDesc.putUnitDouble(cTID("Vrtc"), cTID("#Pxl"), points[p][1]);
        list.putObject(cTID("Pnt "), ptDesc);
    }
    polyDesc.putList(cTID("Pts "), list);
    desc.putObject(cTID("T   "), cTID("Plgn"), polyDesc);
    executeAction(cTID("setd"), desc, DialogModes.NO);
}

function selectGridCell(row, col, numRows, numCols, w, h) {
    var x1 = w * (col / numCols);
    var y1 = h * (row / numRows);
    var x2 = w * ((col + 1) / numCols);
    var y2 = h * ((row + 1) / numRows);
    selectRect(x1, y1, x2, y2);
}

function maskSelection() {
    var desc1 = new ActionDescriptor();
    desc1.putClass(cTID("Nw  "), cTID("Chnl"));
    var ref1 = new ActionReference();
    ref1.putEnumerated(cTID("Chnl"), cTID("Chnl"), cTID("Msk "));
    desc1.putReference(cTID("At  "), ref1);
    desc1.putEnumerated(cTID("Usng"), cTID("UsrM"), cTID("RvlS"));
    executeAction(cTID("Mk  "), desc1, DialogModes.NO);
}

// ==========================================================
// === SHADOW UTILS (aggiunta ombra a layer selezionato)
// ==========================================================
function addShadow(settings) {
    var angle = typeof settings.shadowAngle !== "undefined" ? parseFloat(settings.shadowAngle) : 120;
    var opacity = typeof settings.shadowOpacity !== "undefined" ? parseFloat(settings.shadowOpacity) : 50;
    var dist = typeof settings.shadowDist !== "undefined" ? parseFloat(settings.shadowDist) : 5;
    var size = typeof settings.shadowSize !== "undefined" ? parseFloat(settings.shadowSize) : 5;
    var spread = typeof settings.shadowSpread !== "undefined" ? parseFloat(settings.shadowSpread) : 0;
    var colorHex = settings.shadowColor || "#000000";
    switch (settings.shadow ? settings.shadow.toLowerCase() : "no") {
        case "no": return;
        case "forward": angle = 180; break;
        case "backward": angle = 0; break;
    }
    var r = 0, g = 0, b = 0;
    if(/^#([0-9A-F]{6})$/i.test(colorHex)) {
        r = parseInt(colorHex.substr(1,2), 16);
        g = parseInt(colorHex.substr(3,2), 16);
        b = parseInt(colorHex.substr(5,2), 16);
    }
    var desc30 = new ActionDescriptor();
    var ref12 = new ActionReference();
    ref12.putProperty(cTID("Prpr"), cTID("Lefx"));
    ref12.putEnumerated(cTID("Lyr "), cTID("Ordn"), cTID("Trgt"));
    desc30.putReference(cTID("null"), ref12);
    var desc31 = new ActionDescriptor();
    desc31.putUnitDouble(cTID("gagl"), cTID("#Ang"), angle);
    desc31.putUnitDouble(cTID("Scl "), cTID("#Prc"), 100);
    var desc32 = new ActionDescriptor();
    desc32.putBoolean(cTID("enab"), true);
    desc32.putEnumerated(cTID("Md  "), cTID("BlnM"), cTID("Mltp"));
    var desc33 = new ActionDescriptor();
    desc33.putDouble(cTID("Rd  "), r);
    desc33.putDouble(cTID("Grn "), g);
    desc33.putDouble(cTID("Bl  "), b);
    desc32.putObject(cTID("Clr "), cTID("RGBC"), desc33);
    desc32.putUnitDouble(cTID("Opct"), cTID("#Prc"), opacity);
    desc32.putBoolean(cTID("uglg"), true);
    desc32.putUnitDouble(cTID("lagl"), cTID("#Ang"), angle);
    desc32.putUnitDouble(cTID("Dstn"), cTID("#Pxl"), dist);
    desc32.putUnitDouble(cTID("Ckmt"), cTID("#Pxl"), spread);
    desc32.putUnitDouble(cTID("blur"), cTID("#Pxl"), size);
    desc32.putUnitDouble(cTID("Nose"), cTID("#Prc"), 0);
    desc32.putBoolean(cTID("AntA"), false);
    var desc34 = new ActionDescriptor();
    desc34.putString(cTID("Nm  "), "Linear");
    desc32.putObject(cTID("TrnS"), cTID("ShpC"), desc34);
    desc32.putBoolean(sTID("layerConceals"), true);
    desc31.putObject(cTID("DrSh"), cTID("DrSh"), desc32);
    desc30.putObject(cTID("T   "), cTID("Lefx"), desc31);
    executeAction(cTID("setd"), desc30, DialogModes.NO);
}

// ==========================================================
// === UNIVERSAL WIRE PREVIEW (mostra solo i bordi del pattern scelto su prima immagine)
// ==========================================================

function universalPreview(files, settings, pattern) {
    // - files: lista immagini
    // - settings: settings correnti
    // - pattern: stringa pattern scelto (matcha quello in OutputPattern)
    if (!files.length) { alert("No images found!"); return; }
    var baseFile = openFile(files[0].path + "/" + files[0].name);
    if (!baseFile) return;
    var w = baseFile.width.value || parseInt(baseFile.width);
    var h = baseFile.height.value || parseInt(baseFile.height);

    // Cancella layer wireframe precedente (se presente)
    try {
        for (var i = 0; i < baseFile.artLayers.length; i++) {
            if (baseFile.artLayers[i].name == "WIRE_PREVIEW") {
                baseFile.artLayers[i].remove();
            }
        }
    } catch(e) {}

    // Crea nuovo layer wireframe
    var wireLayer = baseFile.artLayers.add();
    wireLayer.name = "WIRE_PREVIEW";
    wireLayer.opacity = 100;
    baseFile.activeLayer = wireLayer;

    var lineColor = new SolidColor();
    lineColor.rgb.red = 0; lineColor.rgb.green = 0; lineColor.rgb.blue = 0;

    // --- Disegna mesh a seconda del pattern ---
    if (pattern.indexOf("Grid") >= 0) {
        var rows = parseInt(settings.gridRows) || 3;
        var cols = parseInt(settings.gridCols) || 3;
        for (var r = 1; r < rows; r++) {
            var y = (h * r) / rows;
            var pathRef = baseFile.pathItems.add("h" + r, [ [0, y], [w, y] ]);
            pathRef.strokePath(ToolType.BRUSH); pathRef.remove();
        }
        for (var c = 1; c < cols; c++) {
            var x = (w * c) / cols;
            var pathRef = baseFile.pathItems.add("v" + c, [ [x, 0], [x, h] ]);
            pathRef.strokePath(ToolType.BRUSH); pathRef.remove();
        }
    } else if (pattern.indexOf("Vertical") >= 0) {
        var num = files.length;
        for (var i = 1; i < num; i++) {
            var x = w * (i / num);
            var pathRef = baseFile.pathItems.add("vx" + i, [ [x, 0], [x, h] ]);
            pathRef.strokePath(ToolType.BRUSH); pathRef.remove();
        }
    } else if (pattern.indexOf("Horizontal") >= 0) {
        var num = files.length;
        for (var i = 1; i < num; i++) {
            var y = h * (i / num);
            var pathRef = baseFile.pathItems.add("hy" + i, [ [0, y], [w, y] ]);
            pathRef.strokePath(ToolType.BRUSH); pathRef.remove();
        }
    } else if (pattern.indexOf("Radial") >= 0) {
        var num = files.length;
        var cx = w / 2, cy = h / 2, r = Math.sqrt(cx*cx + cy*cy) * 1.2;
        for (var i = 0; i < num; i++) {
            var angle = (i / num) * 2 * Math.PI;
            var x = cx + r * Math.cos(angle), y = cy + r * Math.sin(angle);
            var pathRef = baseFile.pathItems.add("rad" + i, [ [cx, cy], [x, y] ]);
            pathRef.strokePath(ToolType.BRUSH); pathRef.remove();
        }
    } else if (pattern.indexOf("Spiral") >= 0) {
        // preview: disegna spirali radiali semplici
        var num = files.length;
        var cx = w / 2, cy = h / 2, r = Math.sqrt(cx*cx + cy*cy) * 1.1;
        for (var i = 0; i < num; i++) {
            var angle = (i / num) * 2 * Math.PI;
            var x = cx + r * Math.cos(angle), y = cy + r * Math.sin(angle);
            var pathRef = baseFile.pathItems.add("sp" + i, [ [cx, cy], [x, y] ]);
            pathRef.strokePath(ToolType.BRUSH); pathRef.remove();
        }
    } else if (pattern.indexOf("Oval") >= 0) {
        var num = files.length;
        for (var i = 1; i < num; i++) {
            var x1 = ((i / num) * w) / 2;
            var y1 = ((i / num) * h) / 2;
            var x2 = w - x1;
            var y2 = h - y1;
            var desc = new ActionDescriptor();
            var ref = new ActionReference();
            ref.putProperty(cTID("Chnl"), cTID("fsel"));
            desc.putReference(cTID("null"), ref);
            var edesc = new ActionDescriptor();
            edesc.putUnitDouble(cTID("Top "), cTID("#Pxl"), y1);
            edesc.putUnitDouble(cTID("Left"), cTID("#Pxl"), x1);
            edesc.putUnitDouble(cTID("Btom"), cTID("#Pxl"), y2);
            edesc.putUnitDouble(cTID("Rght"), cTID("#Pxl"), x2);
            desc.putObject(cTID("T   "), cTID("Elps"), edesc);
            desc.putBoolean(cTID("AntA"), true);
            executeAction(cTID("setd"), desc, DialogModes.NO);
            // wire: optional, non visivo
        }
    } else if (pattern.indexOf("Triangle") >= 0) {
        // preview triangoli: overlay a griglia
        var side = parseInt(settings.triangleSide) || 150;
        var gap = parseInt(settings.triangleGap) || 0;
        var effectiveSide = side + gap;
        var effectiveHeight = side * Math.sqrt(3) / 2 + gap * Math.sqrt(3) / 2;
        var rows = Math.ceil(h / effectiveHeight);
        var cols = Math.ceil(w / effectiveSide) + 1;
        for (var row = 0; row < rows; row++) {
            for (var col = 0; col < cols; col++) {
                var x0 = col * effectiveSide + ((row % 2) ? effectiveSide / 2 : 0);
                var y0 = row * effectiveHeight;
                var points;
                if ((row + col) % 2 === 0) {
                    points = [
                        [x0, y0 + side * Math.sqrt(3) / 2],
                        [x0 + side / 2, y0],
                        [x0 + side, y0 + side * Math.sqrt(3) / 2]
                    ];
                } else {
                    points = [
                        [x0, y0],
                        [x0 + side, y0],
                        [x0 + side / 2, y0 + side * Math.sqrt(3) / 2]
                    ];
                }
                var pathRef = baseFile.pathItems.add("t" + row + "-" + col, points);
                pathRef.strokePath(ToolType.BRUSH); pathRef.remove();
            }
        }
    } else if (pattern.indexOf("Puzzle") >= 0) {
        // preview puzzle: mostra solo mesh rettangolare base
        var rows = parseInt(settings.puzzleRows) || Math.round(Math.sqrt(files.length));
        var cols = parseInt(settings.puzzleCols) || Math.ceil(files.length / rows);
        for (var r = 1; r < rows; r++) {
            var y = (h * r) / rows;
            var pathRef = baseFile.pathItems.add("p-h" + r, [ [0, y], [w, y] ]);
            pathRef.strokePath(ToolType.BRUSH); pathRef.remove();
        }
        for (var c = 1; c < cols; c++) {
            var x = (w * c) / cols;
            var pathRef = baseFile.pathItems.add("p-v" + c, [ [x, 0], [x, h] ]);
            pathRef.strokePath(ToolType.BRUSH); pathRef.remove();
        }
    }
    // --- Messaggio chiusura preview ---
    alert("Preview generated on first file. \nTo view, close the GUI or move it.");
    // Facoltativo: chiudi la GUI
    // Facoltativo: layer wireframe rimosso automaticamente all'avvio del pattern
}
// ==========================================================
// === FUNZIONI DI SLICING PRINCIPALI (tutti i pattern) ===
// ==========================================================

// --- Funzione generica, helper duplicazione livelli ---
function duplicateLayersInto(targetDoc) {
    for (var z = app.activeDocument.artLayers.length - 1; z >= 0; z--) {
        var al = app.activeDocument.artLayers[z];
        al.duplicate(targetDoc, ElementPlacement.PLACEATEND);
    }
}

// --- Helper: controlla se triangolo visibile nell'immagine (per Triangles) ---
function isTriangleVisible(points, w, h) {
    for (var i = 0; i < points.length; i++) {
        var x = points[i][0], y = points[i][1];
        if (x >= 0 && x <= w && y >= 0 && y <= h) return true;
    }
    return false;
}

// =========================
// === GRID MOSAIC
function runMosaicGrid(files, settings, progressWin) {
    TSP_USER_INTERRUPT = false;
    var numRows = parseInt(settings.gridRows) || 3;
    var numCols = parseInt(settings.gridCols) || 3;
    var totalCells = numRows * numCols;
    var baseFile = openFile(files[0].path + "/" + files[0].name);
    if (!baseFile) return null;
    var newFile = baseFile.duplicate();
    var w = newFile.width.value || parseInt(newFile.width);
    var h = newFile.height.value || parseInt(newFile.height);
    closeFile(baseFile, "nosave");

    for (var cell = 0; cell < totalCells; cell++) {
        if (TSP_USER_INTERRUPT) break;
        try {
            if (progressWin) progressWin.update(cell + 1);
            var row = Math.floor(cell / numCols);
            var col = cell % numCols;
            var imgIdx = cell % files.length;
            var processingFile = openFile(files[imgIdx].path + "/" + files[imgIdx].name);
            if (!processingFile) continue;
            duplicateLayersInto(newFile);
            closeFile(processingFile, "nosave");
            newFile.activeLayer.name = files[imgIdx].name.slice(0, -4);

            selectGridCell(row, col, numRows, numCols, w, h);
            maskSelection();
            addShadow(settings);
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

// =========================
// === VERTICAL SLICES
function runVerticalSlices(files, settings, direction, progressWin) {
    TSP_USER_INTERRUPT = false;
    var numSlices = files.length;
    var baseFile = openFile(files[0].path + "/" + files[0].name);
    if (!baseFile) return null;
    var newFile = baseFile.duplicate();
    var w = newFile.width.value || parseInt(newFile.width);
    var h = newFile.height.value || parseInt(newFile.height);
    closeFile(baseFile, "nosave");

    for (var i = 0; i < numSlices; i++) {
        if (TSP_USER_INTERRUPT) break;
        try {
            if (progressWin) progressWin.update(i + 1);
            var sliceIdx = (direction === "RightToLeft") ? (numSlices - 1 - i) : i;
            var processingFile = openFile(files[sliceIdx].path + "/" + files[sliceIdx].name);
            if (!processingFile) continue;
            duplicateLayersInto(newFile);
            closeFile(processingFile, "nosave");
            newFile.activeLayer.name = files[sliceIdx].name.slice(0, -4);

            var x1 = w * (i / numSlices);
            var x2 = w * ((i + 1) / numSlices);
            selectRect(x1, 0, x2, h);
            maskSelection();
            addShadow(settings);
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

// =========================
// === HORIZONTAL SLICES
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
        if (TSP_USER_INTERRUPT) break;
        try {
            if (progressWin) progressWin.update(i + 1);
            var sliceIdx = (direction === "BottomToTop") ? (numSlices - 1 - i) : i;
            var processingFile = openFile(files[sliceIdx].path + "/" + files[sliceIdx].name);
            if (!processingFile) continue;
            duplicateLayersInto(newFile);
            closeFile(processingFile, "nosave");
            newFile.activeLayer.name = files[sliceIdx].name.slice(0, -4);

            var y1 = h * (i / numSlices);
            var y2 = h * ((i + 1) / numSlices);
            selectRect(0, y1, w, y2);
            maskSelection();
            addShadow(settings);
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

// =========================
// === DIAGONAL SLICES
function runDiagonalSlices(files, settings, direction, progressWin) {
    TSP_USER_INTERRUPT = false;
    var numSlices = files.length;
    var baseFile = openFile(files[0].path + "/" + files[0].name);
    if (!baseFile) return null;
    var newFile = baseFile.duplicate();
    var w = newFile.width.value || parseInt(newFile.width);
    var h = newFile.height.value || parseInt(newFile.height);
    closeFile(baseFile, "nosave");

    for (var i = 0; i < numSlices; i++) {
        if (TSP_USER_INTERRUPT) break;
        try {
            if (progressWin) progressWin.update(i + 1);
            var sliceIdx = (direction === "RightToLeft") ? (numSlices - 1 - i) : i;
            var processingFile = openFile(files[sliceIdx].path + "/" + files[sliceIdx].name);
            if (!processingFile) continue;
            duplicateLayersInto(newFile);
            closeFile(processingFile, "nosave");
            newFile.activeLayer.name = files[sliceIdx].name.slice(0, -4);

            var d = w + h;
            var dx = d / numSlices;
            var x1 = (dx * i);
            var x2 = x1 + dx + 1;
            var x3 = x2 - h;
            var x4 = (x3 - dx) - 1;
            var points = [
                [x1, 0], [x2, 0], [x3, h], [x4, h], [x1, 0]
            ];
            selectPolygon(points);
            maskSelection();
            addShadow(settings);
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

// =========================
// === RADIAL SLICES
function runRadialSlices(files, settings, progressWin) {
    TSP_USER_INTERRUPT = false;
    var numSlices = files.length;
    var baseFile = openFile(files[0].path + "/" + files[0].name);
    if (!baseFile) return null;
    var newFile = baseFile.duplicate();
    var w = newFile.width.value || parseInt(newFile.width);
    var h = newFile.height.value || parseInt(newFile.height);
    closeFile(baseFile, "nosave");
    var cx = w / 2, cy = h / 2, r = Math.sqrt(cx*cx + cy*cy) * 1.2;

    for (var i = 0; i < numSlices; i++) {
        if (TSP_USER_INTERRUPT) break;
        try {
            if (progressWin) progressWin.update(i + 1);
            var imgIdx = (settings.radialOrder === "edge") ? (numSlices - 1 - i) : i;
            var processingFile = openFile(files[imgIdx].path + "/" + files[imgIdx].name);
            if (!processingFile) continue;
            duplicateLayersInto(newFile);
            closeFile(processingFile, "nosave");
            newFile.activeLayer.name = files[imgIdx].name.slice(0, -4);

            var angle1 = (i / numSlices) * 2 * Math.PI;
            var angle2 = ((i + 1) / numSlices) * 2 * Math.PI;
            var points = [
                [cx, cy],
                [cx + r * Math.cos(angle1), cy + r * Math.sin(angle1)],
                [cx + r * Math.cos(angle2), cy + r * Math.sin(angle2)]
            ];
            selectPolygon(points);
            maskSelection();
            addShadow(settings);
            newFile.mergeVisibleLayers();
            try { app.activeDocument = newFile; app.refresh(); }
            catch(e) { $.writeln('DEBUG: errore nel refresh: ' + e); }
        } catch (e) {
            if (e.number && (e.number & 0xFFFF) === 8007) {
                TSP_USER_INTERRUPT = true;
                break;
            } else throw e;
        }
    }
    return TSP_USER_INTERRUPT ? null : newFile;
}

// =========================
// === SPIRAL STRIPES
function runSpiralStripes(files, settings, progressWin) {
    TSP_USER_INTERRUPT = false;
    var numStripes = files.length;
    var twist = parseInt(settings.stripeTwist) || 4;
    var baseFile = openFile(files[0].path + "/" + files[0].name);
    if (!baseFile) return null;
    var newFile = baseFile.duplicate();
    var w = newFile.width.value || parseInt(newFile.width);
    var h = newFile.height.value || parseInt(newFile.height);
    closeFile(baseFile, "nosave");
    var cx = w / 2;
    var cy = h / 2;
    var rMin = 0;
    var rMax = Math.sqrt(cx * cx + cy * cy) * 1.1;
    var steps = 80;

    for (var i = 0; i < numStripes; i++) {
        if (TSP_USER_INTERRUPT) break;
        try {
            if (progressWin) progressWin.update(i + 1);
            var processingFile = openFile(files[i].path + "/" + files[i].name);
            if (!processingFile) continue;
            duplicateLayersInto(newFile);
            closeFile(processingFile, "nosave");
            newFile.activeLayer.name = files[i].name.slice(0, -4);

            var poly = [];
            for (var k = 0; k <= steps; k++) {
                var t = k / steps, r = rMin + (rMax - rMin) * t;
                var baseAngle = (2 * Math.PI) * (i / numStripes);
                var spiralAngle = baseAngle + twist * 2 * Math.PI * (r / rMax);
                poly.push([cx + r * Math.cos(spiralAngle), cy + r * Math.sin(spiralAngle)]);
            }
            for (var k = steps; k >= 0; k--) {
                var t = k / steps, r = rMin + (rMax - rMin) * t;
                var baseAngle = (2 * Math.PI) * ((i + 1) / numStripes);
                var spiralAngle = baseAngle + twist * 2 * Math.PI * (r / rMax);
                poly.push([cx + r * Math.cos(spiralAngle), cy + r * Math.sin(spiralAngle)]);
            }
            selectPolygon(poly);
            maskSelection();
            addShadow(settings);
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

// =========================
// === OVAL/CIRCULAR SLICES
function runOvalCircularSlices(files, settings, direction, progressWin) {
    TSP_USER_INTERRUPT = false;
    var numSlices = files.length;
    var baseFile = openFile(files[0].path + "/" + files[0].name);
    if (!baseFile) return null;
    var newFile = baseFile.duplicate();
    var w = newFile.width.value || parseInt(newFile.width);
    var h = newFile.height.value || parseInt(newFile.height);
    closeFile(baseFile, "nosave");

    for (var i = 0; i < numSlices; i++) {
        if (TSP_USER_INTERRUPT) break;
        try {
            if (progressWin) progressWin.update(i + 1);
            var sliceIdx = (direction === "InsideOut") ? i : (numSlices - 1 - i);
            var processingFile = openFile(files[sliceIdx].path + "/" + files[sliceIdx].name);
            if (!processingFile) continue;
            duplicateLayersInto(newFile);
            closeFile(processingFile, "nosave");
            newFile.activeLayer.name = files[sliceIdx].name.slice(0, -4);

            if (i === 0) {
                selectRect(0, 0, w, h);
            } else {
                var x1 = ((i / numSlices) * w) / 2;
                var y1 = ((i / numSlices) * h) / 2;
                var x2 = w - x1;
                var y2 = h - y1;
                var desc = new ActionDescriptor();
                var ref = new ActionReference();
                ref.putProperty(cTID("Chnl"), cTID("fsel"));
                desc.putReference(cTID("null"), ref);
                var edesc = new ActionDescriptor();
                edesc.putUnitDouble(cTID("Top "), cTID("#Pxl"), y1);
                edesc.putUnitDouble(cTID("Left"), cTID("#Pxl"), x1);
                edesc.putUnitDouble(cTID("Btom"), cTID("#Pxl"), y2);
                edesc.putUnitDouble(cTID("Rght"), cTID("#Pxl"), x2);
                desc.putObject(cTID("T   "), cTID("Elps"), edesc);
                desc.putBoolean(cTID("AntA"), true);
                executeAction(cTID("setd"), desc, DialogModes.NO);
            }
            maskSelection();
            addShadow(settings);
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

// =========================
// === EQUILATERAL TRIANGLES
function runEquilateralTriangles(files, settings, progressWin) {
    TSP_USER_INTERRUPT = false;
    var baseFile = openFile(files[0].path + "/" + files[0].name);
    if (!baseFile) return null;
    var newFile = baseFile.duplicate();
    var w = newFile.width.value || parseInt(newFile.width);
    var h = newFile.height.value || parseInt(newFile.height);
    closeFile(baseFile, "nosave");

    var side = parseInt(settings.triangleSide) || 150;
    var gap = parseInt(settings.triangleGap) || 0;
    var effectiveSide = side + gap;
    var effectiveHeight = side * Math.sqrt(3) / 2 + gap * Math.sqrt(3) / 2;
    var rows = Math.ceil(h / effectiveHeight);
    var cols = Math.ceil(w / effectiveSide) + 1;
    var total = rows * cols;
    var imgCount = files.length;

    var triIdx = 0;
    for (var row = 0; row < rows; row++) {
        for (var col = 0; col < cols; col++) {
            if (TSP_USER_INTERRUPT) break;
            try {
                if (progressWin) progressWin.update(triIdx + 1);
                var imgIdx = triIdx % imgCount;
                var x0 = col * effectiveSide + ((row % 2) ? effectiveSide / 2 : 0);
                var y0 = row * effectiveHeight;
                var points;
                if ((row + col) % 2 === 0) {
                    points = [
                        [x0, y0 + side * Math.sqrt(3) / 2],
                        [x0 + side / 2, y0],
                        [x0 + side, y0 + side * Math.sqrt(3) / 2]
                    ];
                } else {
                    points = [
                        [x0, y0],
                        [x0 + side, y0],
                        [x0 + side / 2, y0 + side * Math.sqrt(3) / 2]
                    ];
                }
                if (!isTriangleVisible(points, w, h)) {
                    triIdx++;
                    continue;
                }
                var processingFile = openFile(files[imgIdx].path + "/" + files[imgIdx].name);
                if (!processingFile) {
                    triIdx++;
                    continue;
                }
                duplicateLayersInto(newFile);
                closeFile(processingFile, "nosave");
                newFile.activeLayer.name = files[imgIdx].name.slice(0, -4);

                selectPolygon(points);
                maskSelection();
                addShadow(settings);
                newFile.mergeVisibleLayers();
                app.activeDocument = newFile;
                app.refresh();
                triIdx++;
            } catch (e) {
                if (e.number && (e.number & 0xFFFF) === 8007) {
                    TSP_USER_INTERRUPT = true;
                    break;
                } else throw e;
            }
        }
    }
    return TSP_USER_INTERRUPT ? null : newFile;
}

// =========================
// === PUZZLE CLASSIC (mesh rettangolare base, preview mesh già universale)
function runPuzzleClassic(files, settings, progressWin) {
    TSP_USER_INTERRUPT = false;
    var rows = parseInt(settings.puzzleRows) || Math.round(Math.sqrt(files.length));
    var cols = parseInt(settings.puzzleCols) || Math.ceil(files.length / rows);

    var baseFile = openFile(files[0].path + "/" + files[0].name);
    if (!baseFile || TSP_USER_INTERRUPT) return null;
    var newFile = baseFile.duplicate();
    var w = newFile.width.value || parseInt(newFile.width);
    var h = newFile.height.value || parseInt(newFile.height);
    closeFile(baseFile, "nosave");

    var piece = 0;
    for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
            if (TSP_USER_INTERRUPT) break;
            try {
                if (progressWin) progressWin.update(piece + 1);
                var imgIdx = piece % files.length;
                var processingFile = openFile(files[imgIdx].path + "/" + files[imgIdx].name);
                if (!processingFile || TSP_USER_INTERRUPT) continue;
                duplicateLayersInto(newFile);
                closeFile(processingFile, "nosave");
                newFile.activeLayer.name = files[imgIdx].name.slice(0, -4);

                // Maschera rettangolare, bordo puzzle
                var x1 = (w * c) / cols;
                var y1 = (h * r) / rows;
                var x2 = (w * (c+1)) / cols;
                var y2 = (h * (r+1)) / rows;
                selectPolygon([[x1,y1],[x2,y1],[x2,y2],[x1,y2]]);

                maskSelection();
                addShadow(settings);
                newFile.mergeVisibleLayers();
                app.activeDocument = newFile;
                app.refresh();
                piece++;
            } catch (e) {
                if (e.number && (e.number & 0xFFFF) === 8007) {
                    TSP_USER_INTERRUPT = true;
                    break;
                } else throw e;
            }
        }
    }

    // Rimuovi wireframe layer se richiesto
    if (!settings.keepWireframe) {
        try {
            var lyr = null;
            for (var i = 0; i < newFile.artLayers.length; i++) {
                if (newFile.artLayers[i].name == "WIRE_PREVIEW") {
                    newFile.artLayers[i].remove();
                }
            }
        } catch (e) {}
    }

    return TSP_USER_INTERRUPT ? null : newFile;
}
// ==========================================
// === UNIVERSAL PREVIEW UTILITY (Wireframe per tutti i pattern base) ===
// ==========================================
function universalPreview(files, settings, pattern) {
    // Apre la prima immagine della serie
    if (!files.length) { alert("No images found!"); return; }
    var baseFile = openFile(files[0].path + "/" + files[0].name);
    if (!baseFile) return;

    var w = baseFile.width.value || parseInt(baseFile.width);
    var h = baseFile.height.value || parseInt(baseFile.height);
    var lyr = baseFile.artLayers.add();
    lyr.name = "WIRE_PREVIEW";
    lyr.opacity = 100;

    baseFile.activeLayer = lyr;
    var col = new SolidColor();
    col.rgb.red = 0; col.rgb.green = 0; col.rgb.blue = 0;

    // Mesh per pattern principali
    if (pattern.indexOf("Vertical") !== -1) {
        var slices = files.length;
        for (var i = 1; i < slices; i++) {
            var x = (w * i) / slices;
            var pathRef = baseFile.pathItems.add("v" + i, [ [x, 0], [x, h] ]);
            pathRef.strokePath(ToolType.BRUSH); pathRef.remove();
        }
    } else if (pattern.indexOf("Horizontal") !== -1) {
        var slices = files.length;
        for (var i = 1; i < slices; i++) {
            var y = (h * i) / slices;
            var pathRef = baseFile.pathItems.add("h" + i, [ [0, y], [w, y] ]);
            pathRef.strokePath(ToolType.BRUSH); pathRef.remove();
        }
    } else if (pattern === "Grid Slices (Mosaic)") {
        var numRows = parseInt(settings.gridRows) || 3;
        var numCols = parseInt(settings.gridCols) || 3;
        for (var r = 1; r < numRows; r++) {
            var y = (h * r) / numRows;
            var pathRef = baseFile.pathItems.add("h" + r, [ [0, y], [w, y] ]);
            pathRef.strokePath(ToolType.BRUSH); pathRef.remove();
        }
        for (var c = 1; c < numCols; c++) {
            var x = (w * c) / numCols;
            var pathRef = baseFile.pathItems.add("v" + c, [ [x, 0], [x, h] ]);
            pathRef.strokePath(ToolType.BRUSH); pathRef.remove();
        }
    } else if (pattern === "Puzzle Classic") {
        var rows = parseInt(settings.puzzleRows) || Math.round(Math.sqrt(files.length));
        var cols = parseInt(settings.puzzleCols) || Math.ceil(files.length / rows);
        for (var r = 1; r < rows; r++) {
            var y = (h * r) / rows;
            var pathRef = baseFile.pathItems.add("h" + r, [ [0, y], [w, y] ]);
            pathRef.strokePath(ToolType.BRUSH); pathRef.remove();
        }
        for (var c = 1; c < cols; c++) {
            var x = (w * c) / cols;
            var pathRef = baseFile.pathItems.add("v" + c, [ [x, 0], [x, h] ]);
            pathRef.strokePath(ToolType.BRUSH); pathRef.remove();
        }
    } // Gli altri: aggiungi altre mesh se vuoi.
    app.activeDocument = baseFile; app.refresh();
    alert("Preview wireframe generated!\nChiudi questa immagine per tornare alla GUI!");
}

// ==========================================
// === PROGRESS WINDOW (compact) ===
// ==========================================
function ProgressWindow(totalSteps) {
    if (isNaN(totalSteps) || totalSteps < 1) totalSteps = 1;
    this.win = new Window("palette", "Progress", undefined, {closeButton: false});
    this.win.orientation = "column";
    this.label = this.win.add("statictext", undefined, "1 / " + totalSteps);
    this.progress = this.win.add("progressbar", undefined, 0, totalSteps);
    this.progress.preferredSize = [240, 16];
    this.win.show();

    var screenW = $.screens && $.screens.length ? $.screens[0].right - $.screens[0].left : 1280;
    var screenH = $.screens && $.screens.length ? $.screens[0].bottom - $.screens[0].top : 800;
    this.win.location = [screenW - this.win.size.width - 20, screenH - this.win.size.height - 60];

    this.update = function(step) {
        if (isNaN(step) || step < 1) step = 1;
        if (step > totalSteps) step = totalSteps;
        this.progress.value = step;
        this.label.text = step + " / " + totalSteps;
        this.win.update();
    };
    this.close = function () {
        this.win.close();
    };
}

// ==========================================
// === GUI PRINCIPALE COMPATTA E ALFAB. ===
// ==========================================
function showDialog(settings) {
    var prefs = settings;
    var myWin = new Window("dialog", "TimeSlicerPro v25", undefined, {resizeable: true});

    // --- INPUT ---
    var g1 = myWin.add("group");
    g1.orientation = "row";
    g1.add("statictext", undefined, "Input Folder:");
    var inputEdit = g1.add("edittext", undefined, prefs.inputFolder || "");
    inputEdit.characters = 26;
    var inputBtn = g1.add("button", undefined, "...");

    // --- OUTPUT ---
    var g2 = myWin.add("group");
    g2.orientation = "row";
    g2.add("statictext", undefined, "Output Folder:");
    var outputEdit = g2.add("edittext", undefined, prefs.outputFolder || "");
    outputEdit.characters = 26;
    var outputBtn = g2.add("button", undefined, "...");

    // --- OUTPUT FILE ---
    var g3 = myWin.add("group");
    g3.orientation = "row";
    g3.add("statictext", undefined, "Output Name:");
    var outputFileEdit = g3.add("edittext", undefined, prefs.outputFile || "TSP-result");
    outputFileEdit.characters = 18;

    // --- FILE TYPE ---
    var g4 = myWin.add("group");
    g4.orientation = "row";
    g4.add("statictext", undefined, "Type:");
    var typeDD = g4.add("dropdownlist", undefined, ["JPG", "PNG"]);
    typeDD.selection = (prefs.outputType && prefs.outputType.toLowerCase() === "png") ? 1 : 0;

    // --- PATTERN ---
    var g5 = myWin.add("group");
    g5.orientation = "row";
    g5.add("statictext", undefined, "Pattern:");
    var patterns = [
        "Diagonal Slices Left To Right", "Diagonal Slices Right To Left",
        "Equilateral Triangles",
        "Grid Slices (Mosaic)",
        "Horizontal Slices Bottom To Top", "Horizontal Slices Top To Bottom",
        "Oval-Circular Slices Outside-In", "Oval-Circular Slices Inside-Out",
        "Puzzle Classic",
        "Radial Slices (Pie)",
        "Spiral Stripes",
        "Vertical Slices Left To Right", "Vertical Slices Right To Left"
    ];
    var patternDD = g5.add("dropdownlist", undefined, patterns);
    patternDD.selection = Math.max(0, patterns.indexOf(prefs.outputPattern || patterns[0]));

    // --- PARAMETRI DINAMICI ---
    // Gruppi di opzioni nascosti e visibili secondo pattern
    var gridGroup = myWin.add("group");
    gridGroup.orientation = "row";
    gridGroup.visible = patternDD.selection.text === "Grid Slices (Mosaic)";
    gridGroup.add("statictext", undefined, "Rows:");
    var gridRows = gridGroup.add("edittext", undefined, prefs.gridRows || 3); gridRows.characters = 2;
    gridGroup.add("statictext", undefined, "Cols:");
    var gridCols = gridGroup.add("edittext", undefined, prefs.gridCols || 3); gridCols.characters = 2;
    var gridPreviewBtn = gridGroup.add("button", undefined, "Preview");

    var puzzleGroup = myWin.add("group");
    puzzleGroup.orientation = "row";
    puzzleGroup.visible = patternDD.selection.text === "Puzzle Classic";
    puzzleGroup.add("statictext", undefined, "Rows:");
    var puzzleRows = puzzleGroup.add("edittext", undefined, prefs.puzzleRows || 0); puzzleRows.characters = 2;
    puzzleGroup.add("statictext", undefined, "Cols:");
    var puzzleCols = puzzleGroup.add("edittext", undefined, prefs.puzzleCols || 0); puzzleCols.characters = 2;
    var puzzleWire = puzzleGroup.add("checkbox", undefined, "Keep Wireframe");
    puzzleWire.value = !!prefs.keepWireframe;
    var puzzlePreviewBtn = puzzleGroup.add("button", undefined, "Preview");

    // --- PREVIEW UNIVERSALE: AGGIUNGILO DOVE VUOI ---
    var universalPrevGroup = myWin.add("group");
    universalPrevGroup.orientation = "row";
    var universalPreviewBtn = universalPrevGroup.add("button", undefined, "Preview Pattern");
    universalPrevGroup.visible = !(patternDD.selection.text === "Puzzle Classic" || patternDD.selection.text === "Grid Slices (Mosaic)");

    // --- SHADOW ---
    var g6 = myWin.add("group");
    g6.orientation = "row";
    g6.add("statictext", undefined, "Shadow:");
    var shadowDD = g6.add("dropdownlist", undefined, ["No", "Forward", "Backward"]);
    shadowDD.selection = (prefs.shadow && prefs.shadow.toLowerCase() === "forward") ? 1 :
                         (prefs.shadow && prefs.shadow.toLowerCase() === "backward") ? 2 : 0;

    // --- LOG ---
    var g7 = myWin.add("group");
    g7.orientation = "row";
    var logBox = g7.add("checkbox", undefined, "LOG file");
    logBox.value = !!prefs.generateLog;

    // --- BUTTONS ---
    var btns = myWin.add("group");
    btns.orientation = "row";
    var okBtn = btns.add("button", undefined, "Time Slice It!");
    var cancelBtn = btns.add("button", undefined, "Exit");

    // --- CREDITS ---
    var credit = myWin.add("statictext", undefined, "CapZicco | github.com/CapZicco");

    // --- DIALOG LOGIC E VISIBILITA' ---
    patternDD.onChange = function () {
        gridGroup.visible = patternDD.selection.text === "Grid Slices (Mosaic)";
        puzzleGroup.visible = patternDD.selection.text === "Puzzle Classic";
        universalPrevGroup.visible = !(patternDD.selection.text === "Puzzle Classic" || patternDD.selection.text === "Grid Slices (Mosaic)");
    };

    inputBtn.onClick = function () {
        var f = Folder.selectDialog("Select input folder", inputEdit.text);
        if (f) inputEdit.text = f.fsName;
    };
    outputBtn.onClick = function () {
        var f = Folder.selectDialog("Select output folder", outputEdit.text);
        if (f) outputEdit.text = f.fsName;
    };

    // --- PREVIEW BUTTONS (Universal, Puzzle, Grid) ---
    universalPreviewBtn.onClick = function () {
        var files = getMyFiles(inputEdit.text, "/.(?:.jpg)$/i");
        var currPattern = patternDD.selection.text;
        universalPreview(files, settings, currPattern);
    };
    gridPreviewBtn.onClick = function () {
        var files = getMyFiles(inputEdit.text, "/.(?:.jpg)$/i");
        var tempSettings = {
            gridRows: parseInt(gridRows.text, 10),
            gridCols: parseInt(gridCols.text, 10)
        };
        universalPreview(files, tempSettings, "Grid Slices (Mosaic)");
    };
    puzzlePreviewBtn.onClick = function () {
        var files = getMyFiles(inputEdit.text, "/.(?:.jpg)$/i");
        var tempSettings = {
            puzzleRows: parseInt(puzzleRows.text, 10),
            puzzleCols: parseInt(puzzleCols.text, 10)
        };
        universalPreview(files, tempSettings, "Puzzle Classic");
    };

    // --- OK / CANCEL ---
    okBtn.onClick = function () {
        settings.inputFolder = inputEdit.text;
        settings.outputFolder = outputEdit.text;
        settings.outputFile = outputFileEdit.text;
        settings.outputType = typeDD.selection.text.toLowerCase();
        settings.outputPattern = patternDD.selection.text;
        settings.gridRows = parseInt(gridRows.text, 10);
        settings.gridCols = parseInt(gridCols.text, 10);
        settings.puzzleRows = parseInt(puzzleRows.text, 10);
        settings.puzzleCols = parseInt(puzzleCols.text, 10);
        settings.keepWireframe = puzzleWire.value;
        settings.shadow = shadowDD.selection.text.toLowerCase();
        settings.generateLog = logBox.value;
        settings.process = true;
        myWin.close();
    };
    cancelBtn.onClick = function () { settings.process = false; myWin.close(); };

    myWin.center(); myWin.show();
}

// ==========================================
// === MAIN ===
// ==========================================
function main() {
    warnIfUnsupported();
    var settings = loadSettings() || getDefaults();

    while (true) {
        try {
            if (filesOpenCount()) {
                if (confirm("There are images open. Close all and start?", true)) {
                    while (filesOpenCount()) closeFile(app.activeDocument, "nosave");
                } else { alert("User stopped."); return; }
            }
            showDialog(settings);
            if (!settings.process) break;
            while (filesOpenCount()) closeFile(app.activeDocument, "nosave");
            var files = getMyFiles(settings.inputFolder, "/.(?:.jpg)$/i");
            var newFile = null, pattern = settings.outputPattern;

            var steps = files.length;
            if (pattern === "Grid Slices (Mosaic)")
                steps = (parseInt(settings.gridRows) || 3) * (parseInt(settings.gridCols) || 3);
            else if (pattern === "Equilateral Triangles") {
                var side = parseInt(settings.triangleSide) || 150;
                var baseFile = openFile(files[0].path + "/" + files[0].name);
                var w = baseFile.width.value || parseInt(baseFile.width);
                var h = baseFile.height.value || parseInt(baseFile.height);
                closeFile(baseFile, "nosave");
                var height = side * Math.sqrt(3) / 2;
                var rows = Math.ceil(h / height);
                var cols = Math.ceil(w / side) + 1;
                steps = rows * cols;
            }
            if (isNaN(steps) || steps < 1) steps = 1;
            var progressWin = new ProgressWindow(steps);

            switch (pattern) {
                case "Grid Slices (Mosaic)":
                    newFile = runMosaicGrid(files, settings, progressWin); break;
                case "Radial Slices (Pie)":
                    newFile = runRadialSlices(files, settings, progressWin); break;
                case "Spiral Stripes":
                    newFile = runSpiralStripes(files, settings, progressWin); break;
                case "Horizontal Slices Top To Bottom":
                    newFile = runHorizontalSlices(files, settings, "TopToBottom", progressWin); break;
                case "Horizontal Slices Bottom To Top":
                    newFile = runHorizontalSlices(files, settings, "BottomToTop", progressWin); break;
                case "Vertical Slices Left To Right":
                    newFile = runVerticalSlices(files, settings, "LeftToRight", progressWin); break;
                case "Vertical Slices Right To Left":
                    newFile = runVerticalSlices(files, settings, "RightToLeft", progressWin); break;
                case "Diagonal Slices Left To Right":
                    newFile = runDiagonalSlices(files, settings, "LeftToRight", progressWin); break;
                case "Diagonal Slices Right To Left":
                    newFile = runDiagonalSlices(files, settings, "RightToLeft", progressWin); break;
                case "Oval-Circular Slices Outside-In":
                    newFile = runOvalCircularSlices(files, settings, "OutsideIn", progressWin); break;
                case "Oval-Circular Slices Inside-Out":
                    newFile = runOvalCircularSlices(files, settings, "InsideOut", progressWin); break;
                case "Equilateral Triangles":
                    newFile = runEquilateralTriangles(files, settings, progressWin); break;
                case "Puzzle Classic":
                    newFile = runPuzzleClassic(files, settings, progressWin); break;
                default:
                    alert("Pattern not implemented: " + pattern);
                    writeLog("Pattern not implemented: " + pattern, settings.outputFolder, settings.generateLog);
            }

            if (progressWin) progressWin.close();

            if (TSP_USER_INTERRUPT) {
                var choice = confirmSpecialExit();
                if (choice === "exit") { while (filesOpenCount()) closeFile(app.activeDocument, "nosave"); break; }
                else if (choice === "menu") continue;
                else if (choice === "continue") { TSP_USER_INTERRUPT = false; continue; }
            }

            if (newFile) {
                var savedPath = saveImage(newFile, settings);
                writeLog("Saved >>>" + savedPath, settings.outputFolder, settings.generateLog);
                alert("Done!\n" + savedPath, "TimeSlicerPro", false);
            } else {
                writeLog("No output generated.", settings.outputFolder, settings.generateLog);
            }

            if (!confirm("Another slicing?", true)) {
                if (filesOpenCount()) {
                    if (confirm("Last image open. Close it?", true)) {
                        while (filesOpenCount()) closeFile(app.activeDocument, "nosave");
                    }
                }
                break;
            }
        } catch (e) {
            if (typeof progressWin !== "undefined" && progressWin) progressWin.close();
            if (e.number && (e.number & 0xFFFF) === 8007) {
                TSP_USER_INTERRUPT = true;
                var choice = confirmSpecialExit();
                if (choice === "exit") { while (filesOpenCount()) closeFile(app.activeDocument, "nosave"); break; }
                else if (choice === "menu") continue;
                else if (choice === "continue") { TSP_USER_INTERRUPT = false; continue; }
            } else {
                alert("Unexpected error: " + e.message + "\n(line " + e.line + ")");
                break;
            }
        }
    }
}
main();

