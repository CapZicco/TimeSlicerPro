/*
 * TimeSlicerPro v25.00 – PATCH 2025-06, CapZicco & Copilot
 * – GUI slim compatta
 * – Preview universale on/off
 * – OutputPattern ordinato A-Z
 * – ESC universale
 * – Pattern: tutti patchati
 * – Puzzle/Preview wireframe (stile basic, migliorabile)
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
        outputPattern: "Diagonal Slices Left To Right",
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

// === UNIVERSAL PREVIEW (prima immagine + wireframe pattern se richiesto) ===
function universalPreview(files, settings, pattern) {
    // Apre la prima immagine, crea il wireframe corrispondente
    if (!files.length) { alert("No images found!"); return; }
    var baseFile = openFile(files[0].path + "/" + files[0].name);
    if (!baseFile) return;
    var w = baseFile.width.value || parseInt(baseFile.width);
    var h = baseFile.height.value || parseInt(baseFile.height);

    var wireLayer = baseFile.artLayers.add();
    wireLayer.name = "PREVIEW_WIREFRAME";
    wireLayer.opacity = 100;
    baseFile.activeLayer = wireLayer;

    var lineColor = new SolidColor(); lineColor.rgb.red = 0; lineColor.rgb.green = 0; lineColor.rgb.blue = 0;
    var rows = 0, cols = 0, i;
    switch (pattern) {
        case "Grid Slices (Mosaic)":
            rows = parseInt(settings.gridRows) || 3;
            cols = parseInt(settings.gridCols) || 3;
            break;
        case "Puzzle Classic":
            rows = parseInt(settings.puzzleRows) || Math.round(Math.sqrt(files.length));
            cols = parseInt(settings.puzzleCols) || Math.ceil(files.length / rows);
            break;
        default:
            rows = cols = files.length;
    }
    // mesh wireframe grid
    for (i = 1; i < rows; i++) {
        var y = (h * i) / rows;
        var pathRef = baseFile.pathItems.add("h" + i, [[0, y], [w, y]]);
        pathRef.strokePath(ToolType.BRUSH);
        pathRef.remove();
    }
    for (i = 1; i < cols; i++) {
        var x = (w * i) / cols;
        var pathRef = baseFile.pathItems.add("v" + i, [[x, 0], [x, h]]);
        pathRef.strokePath(ToolType.BRUSH);
        pathRef.remove();
    }
    app.activeDocument = baseFile;
    app.refresh();
    alert("Preview wireframe generated!\nClick to close image.");
    // Minimizza la GUI per vedere il risultato
    if (typeof $.global.myWin !== "undefined" && $.global.myWin) {
        $.global.myWin.visible = false;
    }
    baseFile.activate();
    // Chiudi al click
    baseFile.windows[0].onClick = function () { baseFile.close(SaveOptions.DONOTSAVECHANGES); };
}

// === PATCHED SLICING FUNCTIONS (tutte esc/robuste) ===
// (Copiare da v24, qui sono già patchate: MosaicGrid, RadialSlices, SpiralStripes, Vertical/Horizontal/Diagonal/Oval/Triangle/Puzzle)
// ... (Inserite come nei blocchi precedenti, vedi v24/v25, tutte patch ESC+merge+refresh)

// (Funzione runVoronoiPattern COMMENTATA)
//function runVoronoiPattern(files, settings, progressWin) {
//    // ... codice Voronoi qui
//    return null;
//}

// === SLICING PATCHED ===

// PATCHED Grid (Mosaic)
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

// PATCHED Radial Slices (Pie)
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

// PATCHED Spiral Stripes
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

// PATCHED Vertical Slices
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

// PATCHED Horizontal Slices
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

// PATCHED Diagonal Slices
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

// PATCHED Oval (Circular) Slices
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

// PATCHED Triangle Slices (Equilaterals)
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

// PATCHED Puzzle Classic (rettangoli, preview wireframe ready)
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

                // Rettangolo: domani puzzle edge!
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

    // Rimuovi wireframe se richiesto
    if (!settings.keepWireframe) {
        try {
            for (var i = 0; i < newFile.artLayers.length; i++) {
                if (newFile.artLayers[i].name == "PREVIEW_WIREFRAME") {
                    newFile.artLayers[i].remove();
                }
            }
        } catch (e) {}
    }

    return TSP_USER_INTERRUPT ? null : newFile;
}

// PATCHED universalPreview richiamabile
// ...già dato sopra nel blocco 2


// === MAIN E CONTROLLO UNIVERSALE ===
function main() {
    warnIfUnsupported();
    var settings = loadSettings() || getDefaults();

    while (true) {
        try {
            // Chiudi immagini aperte
            if (filesOpenCount()) {
                if (confirm("There are images open in Photoshop.\nDo you want to close them all and start?", true)) {
                    while (filesOpenCount()) closeFile(app.activeDocument, "nosave");
                } else {
                    alert("User stopped operation: close the open images and try again."); return;
                }
            }

            showDialog(settings); // GUI compatta e ordinata

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
            // Passi totali (per progress)
            if (pattern === "Equilateral Triangles") {
                var side = parseInt(settings.triangleSide) || 150;
                var baseFile = openFile(files[0].path + "/" + files[0].name);
                var w = baseFile.width.value || parseInt(baseFile.width);
                var h = baseFile.height.value || parseInt(baseFile.height);
                closeFile(baseFile, "nosave");
                var height = side * Math.sqrt(3) / 2;
                var rows = Math.ceil(h / height);
                var cols = Math.ceil(w / side) + 1;
                steps = rows * cols;
            } else if (pattern === "Grid Slices (Mosaic)") {
                steps = (parseInt(settings.gridRows) || 3) * (parseInt(settings.gridCols) || 3);
            } else if (pattern === "Voronoi Cells") {
                steps = parseInt(settings.voronoiCells) || 12;
            } else if (pattern === "Puzzle Classic") {
                var rows = parseInt(settings.puzzleRows) || Math.round(Math.sqrt(files.length));
                var cols = parseInt(settings.puzzleCols) || Math.ceil(files.length / rows);
                steps = rows * cols;
            } else {
                steps = files.length;
            }

            if (isNaN(steps) || steps < 1) steps = 1;
            var progressWin = new ProgressWindow(steps);

            // ORDINE ALFABETICO PATTERN
            switch (pattern) {
                case "Diagonal Slices Left To Right":
                    newFile = runDiagonalSlices(files, settings, "LeftToRight", progressWin); break;
                case "Diagonal Slices Right To Left":
                    newFile = runDiagonalSlices(files, settings, "RightToLeft", progressWin); break;
                case "Equilateral Triangles":
                    newFile = runEquilateralTriangles(files, settings, progressWin); break;
                case "Grid Slices (Mosaic)":
                    newFile = runMosaicGrid(files, settings, progressWin); break;
                case "Horizontal Slices Bottom To Top":
                    newFile = runHorizontalSlices(files, settings, "BottomToTop", progressWin); break;
                case "Horizontal Slices Top To Bottom":
                    newFile = runHorizontalSlices(files, settings, "TopToBottom", progressWin); break;
                case "Oval-Circular Slices Inside-Out":
                    newFile = runOvalCircularSlices(files, settings, "InsideOut", progressWin); break;
                case "Oval-Circular Slices Outside-In":
                    newFile = runOvalCircularSlices(files, settings, "OutsideIn", progressWin); break;
                case "Puzzle Classic":
                    newFile = runPuzzleClassic(files, settings, progressWin); break;
                case "Radial Slices (Pie)":
                    newFile = runRadialSlices(files, settings, progressWin); break;
                case "Spiral Stripes":
                    newFile = runSpiralStripes(files, settings, progressWin); break;
                //case "Voronoi Cells":
                //    newFile = runVoronoiPattern(files, settings, progressWin); break;
                case "Vertical Slices Left To Right":
                    newFile = runVerticalSlices(files, settings, "LeftToRight", progressWin); break;
                case "Vertical Slices Right To Left":
                    newFile = runVerticalSlices(files, settings, "RightToLeft", progressWin); break;
                default:
                    alert("Pattern not implemented: " + pattern);
                    writeLog("Pattern not implemented: " + pattern, settings.outputFolder, settings.generateLog);
            }

            if (progressWin) progressWin.close();

            // GESTIONE ESC/EXIT
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