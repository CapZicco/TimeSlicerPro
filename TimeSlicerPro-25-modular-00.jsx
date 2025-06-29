/*
 * TimeSlicerPro v25.00 - FULL
 * PATCH: Gestione ESC globale + Voronoi modular
 * CapZicco & Copilot
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

// === GLOBALS ===
var TSP_VERSION = "v25.00";
var settingsPath = '~/Documents/tsp/TSP-LastSettingsUsed.txt';

// === SETTINGS, UTILS, LOG ===

function getDefaults() {
    return {
        inputFolder: "~",
        outputFolder: "~",
        outputFile: "output",
        outputType: "jpg",
        outputPattern: "Vertical Slices Left To Right",
        outputQuality: 12,
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
        voronoiCells: 12,
        voronoiRandomize: true,
		puzzleRows: 0,      // 0 = AUTO (calcola da immagini)
        puzzleCols: 0,
        keepWireframe: false,
        generateLog: false
    };
}

// === Function saveSettings ===
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
// === Function loadSettings ===
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
// === Function getNowTimestamp ===
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
// === Function closeFile ===
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
// === Function getMyFiles ===
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
// === Function saveImage ===
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
// === Function duplicateLayersInto ===
function duplicateLayersInto(targetDoc) {
    for (var z = app.activeDocument.artLayers.length - 1; z >= 0; z--) {
        var al = app.activeDocument.artLayers[z];
        al.duplicate(targetDoc, ElementPlacement.PLACEATEND);
    }
}
// === Function writeLog ===
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
// === Function updateProgress ===
function updateProgress(progressWin, step, total) {
    step = parseInt(step, 10);
    total = parseInt(total, 10);
    if (isNaN(step)) step = 0;
    if (isNaN(total) || total < 1) total = 1;
    if (progressWin && typeof progressWin.update === "function") {
        if (step < 0) step = 0;
        if (step > total) step = total;
        progressWin.update(step, step + " of " + total);
    }
}

// === MASKING & SELECTION UTILS ===
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

function isTriangleVisible(points, w, h) {
    for (var i = 0; i < points.length; i++) {
        var x = points[i][0], y = points[i][1];
        if (x >= 0 && x <= w && y >= 0 && y <= h) return true;
    }
    return false;
}
// === PROGRESS WINDOW ===
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

// PATCHED pattern functions (ESC-robuste)
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

// === Function runRadialSlices ===

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

// === Function runSpiralStripes ===

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
// === Function runVerticalSlices ===
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
            try {
                app.activeDocument = newFile;
                app.refresh();
            } catch(e) {
                $.writeln('DEBUG: errore nel refresh: ' + e);
            }
        } catch (e) {
            if (e.number && (e.number & 0xFFFF) === 8007) {
                TSP_USER_INTERRUPT = true;
                break;
            } else throw e;
        }
    }
    return TSP_USER_INTERRUPT ? null : newFile;
}
// === Function runHorizontalSlices ===
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
// === Function runDiagonalSlices ===
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

function previewPuzzleWireframe(files, settings) {
    if (!files.length) { alert("No images found!"); return; }
    var baseFile = openFile(files[0].path + "/" + files[0].name);
    if (!baseFile) return;
    var w = baseFile.width.value || parseInt(baseFile.width);
    var h = baseFile.height.value || parseInt(baseFile.height);

    var rows = parseInt(settings.puzzleRows) || Math.round(Math.sqrt(files.length));
    var cols = parseInt(settings.puzzleCols) || Math.ceil(files.length / rows);

    // Crea livello wireframe sopra l'immagine
    var wireLayer = baseFile.artLayers.add();
    wireLayer.name = "PUZZLE_WIREFRAME";
    wireLayer.opacity = 100;

    // Semplice mesh rettangolare con linee nere (per ora, curve puzzle dopo)
    baseFile.activeLayer = wireLayer;
    var lineColor = new SolidColor();
    lineColor.rgb.red = 0; lineColor.rgb.green = 0; lineColor.rgb.blue = 0;

    for (var r = 1; r < rows; r++) {
        var y = (h * r) / rows;
        var pathRef = baseFile.pathItems.add("h" + r, [
            [0, y], [w, y]
        ]);
        pathRef.strokePath(ToolType.BRUSH);
        pathRef.remove();
    }
    for (var c = 1; c < cols; c++) {
        var x = (w * c) / cols;
        var pathRef = baseFile.pathItems.add("v" + c, [
            [x, 0], [x, h]
        ]);
        pathRef.strokePath(ToolType.BRUSH);
        pathRef.remove();
    }
    app.activeDocument = baseFile;
    app.refresh();
    alert("Preview wireframe generated!\nSe vuoi rifare cambia parametri e rilancia la preview.");
}

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

                // Maschera rettangolare, bordo puzzle domani!
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
                if (newFile.artLayers[i].name == "PUZZLE_WIREFRAME") {
                    newFile.artLayers[i].remove();
                }
            }
        } catch (e) {}
    }

    return TSP_USER_INTERRUPT ? null : newFile;
}


// === Function runOvalCircularSlices ===
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
// === Function runEquilateralTriangles ===
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

// === Function runVoronoiPattern ===
function runVoronoiPattern(files, settings, progressWin) {
    TSP_USER_INTERRUPT = false;
    var numCells = parseInt(settings.voronoiCells) || 12;
    var randomize = settings.voronoiRandomize ? true : false;

    var baseFile = openFile(files[0].path + "/" + files[0].name);
    if (!baseFile || TSP_USER_INTERRUPT) return null;
    var newFile = baseFile.duplicate();
    var w = newFile.width.value || parseInt(newFile.width);
    var h = newFile.height.value || parseInt(newFile.height);
    closeFile(baseFile, "nosave");

    var points = [];
    for (var i = 0; i < numCells; i++) {
        points.push([
            Math.random() * w,
            Math.random() * h
        ]);
    }

    for (var i = 0; i < numCells; i++) {
        if (TSP_USER_INTERRUPT) break;
        try {
            if (progressWin) progressWin.update(i + 1);
            var imgIdx = i % files.length;
            var processingFile = openFile(files[imgIdx].path + "/" + files[imgIdx].name);
            if (!processingFile || TSP_USER_INTERRUPT) continue;
            duplicateLayersInto(newFile);
            closeFile(processingFile, "nosave");
            newFile.activeLayer.name = files[imgIdx].name.slice(0, -4);

            var angleStep = (2 * Math.PI) / 6;
            var radius = Math.min(w, h) / 5 * (0.5 + Math.random() * 0.5);
            var cellPoints = [];
            for (var k = 0; k < 6; k++) {
                var ang = k * angleStep + Math.random() * 0.4;
                var r = radius * (randomize ? (0.8 + Math.random() * 0.5) : 1);
                cellPoints.push([
                    points[i][0] + r * Math.cos(ang),
                    points[i][1] + r * Math.sin(ang)
                ]);
            }
            selectPolygon(cellPoints);
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
// === SLIDER GUI HELPER ===
function addLabeledSlider(parent, label, min, max, value, step) {
    var group = parent.add("group");
    group.orientation = "row";
    group.alignChildren = "center";
    var st = group.add("statictext", undefined, label);
    st.size = [100, 20];
    var slider = group.add("slider", undefined, value, min, max);
    slider.preferredSize.width = 120;
    var edit = group.add("edittext", undefined, value.toString());
    edit.characters = 5;
    slider.onChanging = function () {
        edit.text = Math.round(slider.value/step)*step;
    };
    edit.onChanging = function () {
        var v = parseInt(edit.text, 10);
        if (!isNaN(v) && v >= min && v <= max) {
            slider.value = v;
        }
    };
    edit.onBlur = function() {
        var v = parseInt(edit.text, 10);
        if (isNaN(v) || v < min) v = min;
        if (v > max) v = max;
        edit.text = v;
        slider.value = v;
    };
    return { slider: slider, edit: edit };
}

// === CONFIRM DIALOG PER ESC SPECIAL EXIT ===
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

// === GUI PRINCIPALE ===
function showDialog(settings) {
    var prefs = settings;
    var myWin = new Window("dialog", "TimeSlicerPro " + TSP_VERSION);

    // Input
    myWin.InputPanel = myWin.add("panel", undefined, "Input Folder");
    var InputPanelGroup = myWin.InputPanel.add("group");
    InputPanelGroup.orientation = "row";
    InputPanelGroup.alignment = [ScriptUI.Alignment.LEFT, ScriptUI.Alignment.TOP];

    var Input1Edit = InputPanelGroup.add("edittext", undefined, prefs.inputFolder || "");
    Input1Edit.characters = 50;

    var imgCountLabel = myWin.InputPanel.add("statictext", undefined, "Images found: 0");
    imgCountLabel.graphics.font = "Verdana-bold:11";
    imgCountLabel.alignment = "left";
    function updateImageCount(folderPath) {
        var count = 0;
        try {
            var extList = "/.(?:.jpg)$/i";
            var f = new Folder(folderPath);
            if (f.exists) {
                var files = f.getFiles(function(file) {
                    return file instanceof File && file.name.match(eval(extList));
                });
                count = files.length;
            }
        } catch(e) {}
        imgCountLabel.text = "Images found: " + count;
    }
    updateImageCount(Input1Edit.text);

    var Input1ChooseButton = InputPanelGroup.add("button", undefined, "...");
    Input1ChooseButton.size = [50, 20];
    Input1ChooseButton.helpTip = "Select the folder with images to process. All JPGs will be processed.";
    Input1ChooseButton.onClick = function () {
        var t = Folder.selectDialog("Select your input folder", Input1Edit.text);
        if (t && t.toString().length) {
            Input1Edit.text = t;
            updateImageCount(t);
        }
    };

    // Output
    myWin.SettingsPanel = myWin.add("panel", undefined, "Output Settings");
    var OutputPanelGroup = myWin.SettingsPanel.add("group", undefined, "");
    var OutputLabel = OutputPanelGroup.add("statictext", undefined, "Output Folder");
    OutputLabel.size = [100, 20];
    var OutputFolder = OutputPanelGroup.add("edittext", undefined, prefs.outputFolder || "");
    OutputFolder.characters = 30;
    var Output2ChooseButton = OutputPanelGroup.add("button", undefined, "...");
    Output2ChooseButton.onClick = function () {
        var t = Folder.selectDialog("Select your output folder", OutputFolder.text);
        if (t && t.toString().length) {
            OutputFolder.text = t;
        }
    };
    Output2ChooseButton.size = [50, 20];

    // Output File & Type
    var OutputPanelGroup2 = myWin.SettingsPanel.add("group", undefined, "");
    var OutputLabel2 = OutputPanelGroup2.add("statictext", undefined, "Output File");
    OutputLabel2.size = [100, 20];
    var OutputFile = OutputPanelGroup2.add("edittext", undefined, prefs.outputFile || "TSP-result");
    OutputFile.characters = 30;
    var OutputFileType = OutputPanelGroup2.add("DropDownList", undefined, ["JPG", "PNG"]);
    OutputFileType.selection = (prefs.outputType && prefs.outputType.toLowerCase() === "png") ? 1 : 0;

    // Output Pattern
    var OutputPanelGroup3 = myWin.SettingsPanel.add("group", undefined, "");
    var OutputLabel3 = OutputPanelGroup3.add("statictext", undefined, "Output Pattern");
    OutputLabel3.size = [100, 20];
    var OutputPattern = OutputPanelGroup3.add("DropDownList", undefined, [
        "Horizontal Slices Top To Bottom",
        "Horizontal Slices Bottom To Top",
        "Vertical Slices Left To Right",
        "Vertical Slices Right To Left",
        "Diagonal Slices Left To Right",
        "Diagonal Slices Right To Left",
        "Oval-Circular Slices Outside-In",
        "Oval-Circular Slices Inside-Out",
        "Radial Slices (Pie)",
        "Spiral Stripes",
        "Equilateral Triangles",
        "Grid Slices (Mosaic)",
        "Voronoi Cells",
		"Puzzle Classic"
    ]);
    var patternIndex = 0;
    for (var j = 0; j < OutputPattern.items.length; j++)
        if (OutputPattern.items[j].text === (prefs.outputPattern || "")) patternIndex = j;
    OutputPattern.selection = patternIndex;

    // Radial order
    var radialOrderGroup = OutputPanelGroup3.add("group", undefined, "");
    radialOrderGroup.alignment = [ScriptUI.Alignment.LEFT, ScriptUI.Alignment.TOP];
    var radialOrderLabel = radialOrderGroup.add("statictext", undefined, "Radial order:");
    radialOrderLabel.size = [80, 20];
    var radialOrderDropdown = radialOrderGroup.add("dropdownlist", undefined, ["From Center", "From Edge"]);
    radialOrderDropdown.selection = (prefs.radialOrder && prefs.radialOrder === "edge") ? 1 : 0;
    radialOrderGroup.visible = OutputPattern.selection && OutputPattern.selection.text.indexOf("Radial") === 0;

    // Spiral panel
    var spiralPanel = myWin.SettingsPanel.add("panel", undefined, "Spiral Stripes Options");
    spiralPanel.orientation = "row";
    spiralPanel.alignChildren = "left";
    var spiralNum = addLabeledSlider(spiralPanel, "Number of Stripes:", 2, 64, parseInt(prefs.spiralStripesNum) || 12, 1);
    var spiralTwist = addLabeledSlider(spiralPanel, "Twist:", 0, 12, parseInt(prefs.stripeTwist) || 4, 1);
    spiralPanel.visible = OutputPattern.selection && OutputPattern.selection.text == "Spiral Stripes";

    // Grid panel
    var gridPanel = myWin.SettingsPanel.add("panel", undefined, "Grid Slices Options");
    gridPanel.orientation = "row";
    gridPanel.alignChildren = "left";
    var gridRows = addLabeledSlider(gridPanel, "Rows:", 1, 20, parseInt(prefs.gridRows) || 3, 1);
    var gridCols = addLabeledSlider(gridPanel, "Columns:", 1, 20, parseInt(prefs.gridCols) || 3, 1);
    gridPanel.visible = OutputPattern.selection && OutputPattern.selection.text == "Grid Slices (Mosaic)";

    // Equilateral Triangles panel
    var trianglePanel = myWin.SettingsPanel.add("panel", undefined, "Triangle Options");
    trianglePanel.orientation = "row";
    trianglePanel.alignChildren = "left";
    var triangleSide = addLabeledSlider(trianglePanel, "Triangle side:", 20, 1000, parseInt(prefs.triangleSide) || 150, 1);
    var triangleGap = addLabeledSlider(trianglePanel, "Space between triangles:", 0, 100, parseInt(prefs.triangleGap) || 0, 1);
    trianglePanel.visible = OutputPattern.selection && OutputPattern.selection.text == "Equilateral Triangles";

    // Voronoi panel
    var voronoiPanel = myWin.SettingsPanel.add("panel", undefined, "Voronoi Options");
    voronoiPanel.orientation = "row";
    voronoiPanel.alignChildren = "left";
    var voronoiCells = addLabeledSlider(voronoiPanel, "Cells:", 2, 64, parseInt(prefs.voronoiCells) || 12, 1);
    var voronoiRandGroup = voronoiPanel.add("group");
    var voronoiRandCheckbox = voronoiRandGroup.add("checkbox", undefined, "Randomize shapes");
    voronoiRandCheckbox.value = prefs.voronoiRandomize || true;
    voronoiPanel.visible = OutputPattern.selection && OutputPattern.selection.text == "Voronoi Cells";

    // Drop shadow panel
    var shadowPanel = myWin.add("panel", undefined, "Drop Shadow Options");
    shadowPanel.orientation = "column";
    shadowPanel.alignChildren = "left";
    var shadowGroup = shadowPanel.add("group");
    shadowGroup.add("statictext", undefined, "Shadow:");
    var shadowDropdown = shadowGroup.add("dropdownlist", undefined, ["No", "Forward", "Backward"]);
    shadowDropdown.selection = (prefs.shadow && prefs.shadow.toLowerCase() === "forward") ? 1 :
                              (prefs.shadow && prefs.shadow.toLowerCase() === "backward") ? 2 : 0;
    var colorGroup = shadowPanel.add("group");
    colorGroup.add("statictext", undefined, "Color (#RRGGBB):");
    var colorInput = colorGroup.add("edittext", undefined, prefs.shadowColor || "#000000");
    colorInput.characters = 7;
    var opacity = addLabeledSlider(shadowPanel, "Opacity:", 1, 100, parseInt(prefs.shadowOpacity) || 50, 1);
    var angle = addLabeledSlider(shadowPanel, "Angle:", 0, 360, parseInt(prefs.shadowAngle) || 120, 1);
    var distance = addLabeledSlider(shadowPanel, "Distance:", 0, 100, parseInt(prefs.shadowDist) || 5, 1);
    var blur = addLabeledSlider(shadowPanel, "Blur:", 0, 100, parseInt(prefs.shadowSize) || 5, 1);
    var spread = addLabeledSlider(shadowPanel, "Spread:", 0, 100, parseInt(prefs.shadowSpread) || 0, 1);

	// Puzzle panel
	var puzzlePanel = myWin.SettingsPanel.add("panel", undefined, "Puzzle Classic Options");
	puzzlePanel.orientation = "row";
	puzzlePanel.alignChildren = "left";
	var puzzleRows = addLabeledSlider(puzzlePanel, "Rows:", 0, 20, parseInt(prefs.puzzleRows) || 0, 1);
	var puzzleCols = addLabeledSlider(puzzlePanel, "Cols:", 0, 20, parseInt(prefs.puzzleCols) || 0, 1);
	var puzzleWireCheck = puzzlePanel.add("checkbox", undefined, "Keep mesh wireframe layer in output");
	var previewBtn = puzzlePanel.add("button", undefined, "Anteprima puzzle");
previewBtn.onClick = function () {
    var files = getMyFiles(Input1Edit.text, "/.(?:.jpg)$/i");
    var tempSettings = {
        puzzleRows: parseInt(puzzleRows.edit.text, 10),
        puzzleCols: parseInt(puzzleCols.edit.text, 10)
    };
    previewPuzzleWireframe(files, tempSettings);
};

	puzzleWireCheck.value = !!prefs.keepWireframe;
	puzzlePanel.visible = OutputPattern.selection && OutputPattern.selection.text == "Puzzle Classic";
   
   // LOG CHECKBOX
    var logGroup = myWin.add("group", undefined, "");
    logGroup.orientation = "row";
    var logCheckbox = logGroup.add("checkbox", undefined, "Generate LOG file");
    logCheckbox.value = prefs.generateLog || false;
    logCheckbox.helpTip = "If checked, a log file of the operations will be created.";

    // BUTTONS GROUP
    var Button_Group = myWin.add("group", undefined, "");
    Button_Group.orientation = "row";
    Button_Group.okBtn = Button_Group.add("button", undefined, "Time Slice It!", { name: "ok" });
    Button_Group.okBtn.size = [200, 40];
    Button_Group.cancelBtn = Button_Group.add("button", undefined, "Exit", { name: "Exit" });
    Button_Group.cancelBtn.size = [100, 40];
    Button_Group.saveSettingsBtn = Button_Group.add("button", undefined, "Save Settings");
    Button_Group.saveSettingsBtn.size = [110, 40];
    Button_Group.loadSettingsBtn = Button_Group.add("button", undefined, "Load Settings");
    Button_Group.loadSettingsBtn.size = [110, 40];

    // Pattern switch visibilità pannelli
    OutputPattern.onChange = function() {
        gridPanel.visible = OutputPattern.selection && OutputPattern.selection.text == "Grid Slices (Mosaic)";
        spiralPanel.visible = OutputPattern.selection && OutputPattern.selection.text == "Spiral Stripes";
        trianglePanel.visible = OutputPattern.selection && OutputPattern.selection.text == "Equilateral Triangles";
        radialOrderGroup.visible = OutputPattern.selection && OutputPattern.selection.text.indexOf("Radial") === 0;
        voronoiPanel.visible = OutputPattern.selection && OutputPattern.selection.text == "Voronoi Cells";
        puzzlePanel.visible = OutputPattern.selection && OutputPattern.selection.text == "Puzzle Classic";
		myWin.layout.layout(true);
        myWin.update();
    };

    Button_Group.saveSettingsBtn.onClick = function () {
        settings.inputFolder    = Input1Edit.text;
        settings.outputFolder   = OutputFolder.text;
        settings.outputFile     = OutputFile.text;
        settings.outputType     = OutputFileType.selection ? OutputFileType.selection.text.toLowerCase() : "jpg";
        settings.outputPattern  = OutputPattern.selection ? OutputPattern.selection.text : "Horizontal Slices Top To Bottom";
        settings.outputQuality  = 12;
        settings.shadow         = shadowDropdown.selection ? shadowDropdown.selection.text.toLowerCase() : "no";
        settings.shadowColor    = colorInput.text;
        settings.shadowOpacity  = parseInt(opacity.edit.text, 10);
        settings.shadowAngle    = parseInt(angle.edit.text, 10);
        settings.shadowDist     = parseInt(distance.edit.text, 10);
        settings.shadowSize     = parseInt(blur.edit.text, 10);
        settings.shadowSpread   = parseInt(spread.edit.text, 10);
        settings.radialOrder    = radialOrderDropdown.selection ? (radialOrderDropdown.selection.index === 1 ? "edge" : "center") : "center";
        settings.stripeTwist    = parseInt(spiralTwist.edit.text, 10);
        settings.spiralStripesNum = parseInt(spiralNum.edit.text, 10);
        settings.gridRows = parseInt(gridRows.edit.text, 10);
        settings.gridCols = parseInt(gridCols.edit.text, 10);
        settings.triangleSide = parseInt(triangleSide.edit.text, 10);
        settings.triangleGap = parseInt(triangleGap.edit.text, 10);
        settings.voronoiCells = parseInt(voronoiCells.edit.text, 10);
        settings.voronoiRandomize = voronoiRandCheckbox.value;
		settings.puzzleRows = parseInt(puzzleRows.edit.text, 10);
		settings.puzzleCols = parseInt(puzzleCols.edit.text, 10);
		settings.keepWireframe = puzzleWireCheck.value;

        settings.generateLog    = logCheckbox.value ? true : false;
        saveSettings(settings);
        alert("Settings saved.");
    };

    Button_Group.loadSettingsBtn.onClick = function () {
        var file = File.openDialog("Select a settings file", "*.txt");
        if (!file) return;
        if (!file.open("r")) {
            alert("Could not open file: " + file.fsName);
            return;
        }
        var lines = [];
        while (!file.eof) lines.push(file.readln());
        file.close();
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (!line || line.indexOf(":") < 1) continue;
            var idx = line.indexOf(":");
            var key = line.substring(0, idx).replace(/\s/g, "");
            var value = line.substring(idx + 1).replace(/^\s+/, "");
            settings[key] = value;
        }
        try {
            Input1Edit.text = settings.inputFolder || "";
            OutputFolder.text = settings.outputFolder || "";
            OutputFile.text = settings.outputFile || "";
            if (OutputFileType && settings.outputType) {
                OutputFileType.selection = (settings.outputType.toLowerCase() === "png") ? 1 : 0;
            }
            if (OutputPattern && settings.outputPattern) {
                for (var j = 0; j < OutputPattern.items.length; j++) {
                    if (OutputPattern.items[j].text === settings.outputPattern) {
                        OutputPattern.selection = j;
                        break;
                    }
                }
                radialOrderGroup.visible = OutputPattern.selection && OutputPattern.selection.text.indexOf("Radial") === 0;
                spiralPanel.visible = OutputPattern.selection && OutputPattern.selection.text == "Spiral Stripes";
                gridPanel.visible = OutputPattern.selection && OutputPattern.selection.text == "Grid Slices (Mosaic)";
                trianglePanel.visible = OutputPattern.selection && OutputPattern.selection.text == "Equilateral Triangles";
                voronoiPanel.visible = OutputPattern.selection && OutputPattern.selection.text == "Voronoi Cells";
            }
            if (radialOrderDropdown && settings.radialOrder) {
                radialOrderDropdown.selection = (settings.radialOrder === "edge") ? 1 : 0;
            }
            if (shadowDropdown && settings.shadow) {
                var selIdx = 0;
                if (settings.shadow.toLowerCase() === "forward") selIdx = 1;
                else if (settings.shadow.toLowerCase() === "backward") selIdx = 2;
                shadowDropdown.selection = selIdx;
            }
            colorInput.text = settings.shadowColor || "#000000";
            opacity.edit.text = settings.shadowOpacity;
            angle.edit.text = settings.shadowAngle;
            distance.edit.text = settings.shadowDist;
            blur.edit.text = settings.shadowSize;
            spread.edit.text = settings.shadowSpread;
            spiralTwist.edit.text = settings.stripeTwist;
            spiralNum.edit.text = settings.spiralStripesNum;
            gridRows.edit.text = settings.gridRows;
            gridCols.edit.text = settings.gridCols;
            triangleSide.edit.text = settings.triangleSide;
            triangleGap.edit.text = settings.triangleGap;
            voronoiCells.edit.text = settings.voronoiCells;
            voronoiRandCheckbox.value = settings.voronoiRandomize;
			puzzleRows.edit.text = settings.puzzleRows;
puzzleCols.edit.text = settings.puzzleCols;
puzzleWireCheck.value = settings.keepWireframe;

            updateImageCount(Input1Edit.text);
            myWin.layout.layout(true);
            myWin.update();
        } catch (e) {
            alert("Error updating UI: " + e);
        }
        alert("Settings loaded.");
    };

    Button_Group.cancelBtn.onClick = function () {
        myWin.close();
        settings.process = false;
    };

    Button_Group.okBtn.onClick = function () {
        if (Input1Edit.text.length < 1) {
            alert("Input Folder Not Specified", "INPUT ERROR", true);
            return false;
        }
        if (OutputFolder.text.length < 1) {
            alert("Output Folder Not Specified", "SETTINGS ERROR", true);
            return false;
        }
        if (OutputFile.text.length < 1) {
            alert("Output File Not Specified", "SETTINGS ERROR", true);
            return false;
        }
        if (!OutputPattern.selection || OutputPattern.selection.index < 0) {
            OutputPattern.selection = 0;
        }
        settings.inputFolder = Input1Edit.text;
        settings.outputFolder = OutputFolder.text;
        settings.outputFile = OutputFile.text;
        settings.outputType = OutputFileType.selection.text.toLowerCase();
        settings.outputPattern = OutputPattern.selection.text;

        settings.shadow = shadowDropdown.selection.text.toLowerCase();
        settings.shadowColor = colorInput.text;
        settings.shadowOpacity = parseInt(opacity.edit.text, 10);
        settings.shadowAngle = parseInt(angle.edit.text, 10);
        settings.shadowDist = parseInt(distance.edit.text, 10);
        settings.shadowSize = parseInt(blur.edit.text, 10);
        settings.shadowSpread = parseInt(spread.edit.text, 10);

        settings.stripeTwist = parseInt(spiralTwist.edit.text, 10);
        settings.spiralStripesNum = parseInt(spiralNum.edit.text, 10);

        settings.gridRows = parseInt(gridRows.edit.text, 10);
        settings.gridCols = parseInt(gridCols.edit.text, 10);

        settings.triangleSide = parseInt(triangleSide.edit.text, 10);
        settings.triangleGap = parseInt(triangleGap.edit.text, 10);

        settings.voronoiCells = parseInt(voronoiCells.edit.text, 10);
        settings.voronoiRandomize = voronoiRandCheckbox.value;

        settings.radialOrder = radialOrderDropdown.selection ? (radialOrderDropdown.selection.index === 1 ? "edge" : "center") : "center";

		settings.puzzleRows = parseInt(puzzleRows.edit.text, 10);
		settings.puzzleCols = parseInt(puzzleCols.edit.text, 10);
		settings.keepWireframe = puzzleWireCheck.value;


        settings.generateLog = logCheckbox.value ? true : false;
        saveSettings(settings);
        settings.process = true;
        myWin.close();
    };

    // Credits
    myWin.CreditPanel = myWin.add("panel", undefined, "TimeSlicerPro:");
    var CreditText = myWin.CreditPanel.add("group", undefined, "");
    var CreditTextLabel = CreditText.add("statictext", undefined, "CapZicco | Email: capzicco@gmail.com", { multiline: true });
    CreditTextLabel.graphics.font = "Verdana-bold:12";
    CreditTextLabel.size = [430, 20];

    myWin.center();
    myWin.show();
}
function main() {
    warnIfUnsupported();
    var settings = loadSettings() || getDefaults();

    while (true) {
        try {
            if (filesOpenCount()) {
                if (confirm("There are images open in Photoshop.\nDo you want to close them all and start?", true)) {
                    while (filesOpenCount()) closeFile(app.activeDocument, "nosave");
                } else {
                    alert("User stopped operation: close the open images and try again."); return;
                }
            }
            showDialog(settings);
            if (!settings.process) {
                if (filesOpenCount()) {
                    if (confirm("The last generated image is still open.\nDo you want to close it?", true)) {
                        while (filesOpenCount()) closeFile(app.activeDocument, "nosave");
                    }
                }
                break;
            }
            while (filesOpenCount()) closeFile(app.activeDocument, "nosave");
            var files = getMyFiles(settings.inputFolder, "/.(?:.jpg)$/i");
            var newFile = null;
            var pattern = settings.outputPattern;

            var steps = 1;
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
            } else if (pattern === "Voronoi Cells") {
                steps = parseInt(settings.voronoiCells) || 12;
            } else 
                steps = files.length;

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
                case "Voronoi Cells":
                    newFile = runVoronoiPattern(files, settings, progressWin); break;
					case "Puzzle Classic":
				newFile = runPuzzleClassic(files, settings, progressWin); break;

                default:
                    alert("Pattern not implemented: " + pattern);
                    writeLog("Pattern not implemented: " + pattern, settings.outputFolder, settings.generateLog);
            }

            if (progressWin) progressWin.close();

            if (TSP_USER_INTERRUPT) {
                var choice = confirmSpecialExit();
                if (choice === "exit") {
                    while (filesOpenCount()) closeFile(app.activeDocument, "nosave");
                    break;
                } else if (choice === "menu") {
                    continue;
                } else if (choice === "continue") {
                    TSP_USER_INTERRUPT = false;
                    continue;
                }
            }

            if (newFile) {
                var savedPath = saveImage(newFile, settings);
                writeLog("Saved >>>" + savedPath, settings.outputFolder, settings.generateLog);
                alert("Done!\nCheck your work\n\n\n" + savedPath, "www.flickr.com/photos/luca-aka-zicco/", false);
            } else {
                writeLog("No output file generated: pattern not implemented or error.", settings.outputFolder, settings.generateLog);
            }

            if (confirm("Do you want to generate another slicing?", true)) {
                continue;
            } else {
                if (filesOpenCount()) {
                    if (confirm("The last generated image is still open.\nDo you want to close it?", true)) {
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
                if (choice === "exit") {
                    while (filesOpenCount()) closeFile(app.activeDocument, "nosave");
                    break;
                } else if (choice === "menu") {
                    continue;
                } else if (choice === "continue") {
                    TSP_USER_INTERRUPT = false;
                    continue;
                }
            } else {
                alert("Unexpected error: " + e.message + "\n(line " + e.line + ")");
                break;
            }
        }
    }
}
main();
