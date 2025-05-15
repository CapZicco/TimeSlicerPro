/*
 * TimeSlicerPro v17 - FULL SCRIPT AUTOSAVE SETTINGS (Parte 1/2)
 * by CapZicco & Copilot
 *
 * Novità v17:
 * - I settings usati vengono sempre salvati in ~/Documents/tsp/TSP-LastSettingsUsed.txt
 * - All'apertura (e su ogni "Ripeti") la dialog si prepopola con gli ultimi settings usati
 * - Se il file non esiste, vengono usati i default
 * - Tutte le patch: spiral stripes, salvataggio con timestamp, shadow, angle, log, ecc.
 * - Nessun azzeramento, nessun intervento manuale richiesto
 */

// =========================
// 1. FILESYSTEM & DOCUMENT UTILITIES
// =========================

function getNowTimestamp() {
    var now = new Date();
    return now.getFullYear().toString() + "-" +
        ("0" + (now.getMonth() + 1)).slice(-2) + "-" +
        ("0" + now.getDate()).slice(-2) + "_" +
        ("0" + now.getHours()).slice(-2) + "-" +
        ("0" + now.getMinutes()).slice(-2) + "-" +
        ("0" + now.getSeconds()).slice(-2);
}

function filesOpenCount() {
    return app.documents.length;
}
function fileExist(fileWithPath) {
    return File(fileWithPath).exists;
}
function openFile(fileWithPath) {
    if (fileExist(fileWithPath)) { 
        var thisFile = File(fileWithPath);
        var fileRef = app.open(thisFile);
        return fileRef;
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
function saveImage(type, folder, fileName, quality) {
    var ext = type.toLowerCase();
    if (ext.charAt(0) !== ".") ext = "." + ext;
    var timestamp = getNowTimestamp();
    var fileNameWithTs = fileName + "_" + timestamp;
    var path = makeFilePath(folder, fileNameWithTs, ext);
    var fileObj = new File(path);
    if (ext === ".jpg" || ext === ".jpeg") {
        var jpegOptions = new JPEGSaveOptions();
        jpegOptions.quality = quality || 12;
        jpegOptions.embedColorProfile = true;
        activeDocument.saveAs(fileObj, jpegOptions, true);
    } else if (ext === ".png") {
        var opts = new PNGSaveOptions();
        opts.format = SaveDocumentType.PNG;
        opts.transparency = true;
        opts.PNGB = false;
        opts.quality = 100;
        opts.includeProfile = true;
        activeDocument.saveAs(fileObj, opts, true, Extension.LOWERCASE);
    } else {
        throw new Error("Unsupported format for saveImage: " + ext);
    }
    return path;
}
function duplicateLayersInto(folderRef) {
    for (var z = app.activeDocument.artLayers.length - 1; z >= 0; z--) { 
        var al = app.activeDocument.artLayers[z];
        al.duplicate(folderRef, ElementPlacement.PLACEATEND);
    }
}
function getMyFiles(sourceFolder, extList) {
    var fileArray = [];
    var t = Folder(sourceFolder);
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
cTID = function (s) { return app.charIDToTypeID(s); };
sTID = function (s) { return app.stringIDToTypeID(s); };

// =========================
// 2. SETTINGS LAST-USED SYSTEM
// =========================

var TSclass = function () {};

TSclass.getDefaults = function () {
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
        importFileExtensions: "/.(?:.jpg)$/i",
        dummyText: "",
        stripeTwist: 4,
        spiralStripesNum: 12,
        generateLog: false
    };
};
TSclass.saveLastSettings = function(settings) {
    var folder = Folder('~/Documents/tsp/');
    if (!folder.exists) folder.create();
    var file = new File(folder.fsName + "/TSP-LastSettingsUsed.txt");
    file.open("w");
    for (var k in settings) {
        if (settings.hasOwnProperty(k)) {
            file.writeln(k + ": " + settings[k]);
        }
    }
    file.close();
};
TSclass.loadLastSettings = function() {
    var file = new File('~/Documents/tsp/TSP-LastSettingsUsed.txt');
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
    var def = TSclass.getDefaults();
    for (var k in def) {
        if (!obj.hasOwnProperty(k)) obj[k] = def[k];
        if (/^\d+$/.test(obj[k])) obj[k] = parseInt(obj[k], 10);
        if (obj[k] === "true") obj[k] = true;
        if (obj[k] === "false") obj[k] = false;
    }
    return obj;
};

// =========================
// 3. MAIN WORKFLOW
// =========================

TSclass.prototype.main = function () {
    var repeat = true;
    while (repeat) {
        TSclass.p = TSclass.loadLastSettings() || TSclass.getDefaults();
        TSclass.p.wantAnother = false;
        if (app.documents.length) {
            alert("Please close all images and keep the stage empty.\n\nTry again.", " Close All Open Files");
            return;
        }
        TSclass.dialogAndSetOptions();
        if (TSclass.p.process) {
            TSclass.SliceIt();
            repeat = !!TSclass.p.wantAnother;
        } else {
            TSclass.userAbort();
            break;
        }
    }
};
TSclass.closeAll = function () {
    while (filesOpenCount()) {
        closeFile(app.activeDocument, "nosave");
    }
};
TSclass.userAbort = function () {
    alert("Process aborted by the user.");
    return;
};

// =========================
// 4. SLICING ENGINE
// =========================
TSclass.SliceIt = function () {
    TSclass.myAlert("---------------> SLICING <---------------");
    TSclass.myAlert("Shadow setting is " + (TSclass.p.shadow ? TSclass.p.shadow.toLowerCase() : "no"));
    var files = getMyFiles(TSclass.p.inputFolder, TSclass.p.importFileExtensions || "/.(?:.jpg)$/i");
    var len = files.length;
    var newFile;
    for (var i = 0; i < len; i++) {
        TSclass.myAlert("Trying to open file " + files[i].name);
        var processingFile = openFile(files[i].path + "/" + files[i].name);
        TSclass.myAlert("Opened file " + files[i].name);
        if (!TSclass.vc()) {
            TSclass.closeAll();
            return false;
        }
        var thisName = processingFile.name;
        if (i == 0) {
            TSclass.myAlert("This is the first image");
            newFile = processingFile.duplicate();
            TSclass.p.w = newFile.width.value || parseInt(newFile.width);
            TSclass.p.h = newFile.height.value || parseInt(newFile.height);
        } else {
            if ((TSclass.p.w == processingFile.width) && (TSclass.p.h == processingFile.height)) {
                TSclass.myAlert("D");
                duplicateLayersInto(newFile);
            } else {
                TSclass.myAlert("Image size mismatched");
                alert("Image " + processingFile.name + " is not the same size as the first, IGNORING");
            }
        }
        closeFile(processingFile, "nosave");
        newFile.activeLayer.name = thisName.slice(0, -4);
        TSclass.maskIt(i, len);
        TSclass.myAlert("M");
        var newLayerRef = app.activeDocument.artLayers.add();
        switch (TSclass.p.shadow ? TSclass.p.shadow.toLowerCase() : "no") {
            case "forward":
                newLayerRef.move(newFile, ElementPlacement.PLACEATEND);
                break;
            case "backward":
                newLayerRef.move(newFile, ElementPlacement.PLACEATBEGINNING);
                break;
        }
        newFile.mergeVisibleLayers();
    }
    TSclass.myAlert("Saving....");
    var savedPath = saveImage(
        TSclass.p.outputType || "jpg",
        TSclass.p.outputFolder,
        TSclass.p.outputFile,
        TSclass.p.outputQuality || 12
    );
    TSclass.myAlert("Saved >>>" + savedPath);
    TSclass.myAlert("Done, closing and saving");
    closeFile(newFile, "nosave");
    alert("Done!\nCheck your work\n\n\n" + savedPath, "www.flickr.com/photos/luca-aka-zicco/", false);
    if (confirm("Do you want to generate another slicing?", true)) {
        TSclass.p.wantAnother = true;
    } else {
        TSclass.p.wantAnother = false;
    }
};

// =========================
// 5. MASKING, SELECTIONS, SPIRAL STRIPES, SHADOW
// =========================

TSclass.maskIt = function (i, len) {
    var radialOrder = TSclass.p.radialOrder || "center";
    switch (TSclass.p.outputPattern) {
        case "Horizontal Slices Top To Bottom":
            var x1 = 0;
            var y1 = TSclass.p.h * (i / len);
            var x2 = TSclass.p.w;
            var y2 = TSclass.p.h * ((i + 1) / len);
            TSclass.selectRect(x1, y1, x2, y2);
            break;
        case "Horizontal Slices Bottom To Top":
            var x1 = 0;
            var y1 = TSclass.p.h * ((len - (i + 1)) / len);
            var x2 = TSclass.p.w;
            var y2 = TSclass.p.h * ((len - i) / len);
            TSclass.selectRect(x1, y1, x2, y2);
            break;
        case "Diagonal 45 degrees Left To Right":
        case "Diagonal Slices Left To Right":
            TSclass.selectInclined(i, len);
            break;
        case "Diagonal 45 degrees Right To Left":
        case "Diagonal Slices Right To Left":
            TSclass.selectInclined(len - (i + 1), len);
            break;
        case "Oval-Circular Slices Outside-In":
            TSclass.selectEclipse(i, len, true);
            break;
        case "Oval-Circular Slices Inside-Out":
            TSclass.selectEclipse(len - (i + 1), len, false);
            break;
        case "Vertical Slices Left To Right":
            var x1 = TSclass.p.w * (i / len);
            var y1 = 0;
            var x2 = TSclass.p.w * ((i + 1) / len);
            var y2 = TSclass.p.h;
            TSclass.selectRect(x1, y1, x2, y2);
            break;
        case "Vertical Slices Right To Left":
            var x1 = TSclass.p.w * ((len - (i + 1)) / len);
            var y1 = 0;
            var x2 = TSclass.p.w * ((len - i) / len);
            var y2 = TSclass.p.h;
            TSclass.selectRect(x1, y1, x2, y2);
            break;
        case "Radial Slices (Pie)":
        case "Radial Slices":
            var idx = (radialOrder === "edge") ? (len - 1 - i) : i;
            TSclass.selectRadial(idx, len);
            break;
        case "Spiral Stripes":
            TSclass.selectSpiralStripe(i, TSclass.p.spiralStripesNum || len, TSclass.p.stripeTwist || 4, TSclass.p.w, TSclass.p.h);
            break;
        case "Radial":
        case "Circular":
            alert("to do");
            break;
    }
    TSclass.maskSelection();
    TSclass.addShadow();
};

TSclass.selectRect = function (x1, y1, x2, y2) {
    var desc111 = new ActionDescriptor();
    var ref111 = new ActionReference();
    ref111.putProperty(cTID("Chnl"), sTID("selection"));
    desc111.putReference(cTID("null"), ref111);
    var desc211 = new ActionDescriptor();
    desc211.putUnitDouble(cTID("Top "), cTID("#Pxl"), y1);
    desc211.putUnitDouble(cTID("Left"), cTID("#Pxl"), x1);
    desc211.putUnitDouble(cTID("Btom"), cTID("#Pxl"), y2);
    desc211.putUnitDouble(cTID("Rght"), cTID("#Pxl"), x2);
    desc111.putObject(cTID("T   "), cTID("Rctn"), desc211);
    executeAction(cTID("setd"), desc111, DialogModes.NO);
};

TSclass.selectInclined = function (i, j) {
    var doc = app.activeDocument;
    var w = parseInt(doc.width);
    var h = parseInt(doc.height);
    var d = parseInt(w + h);
    var dx = d / j;
    var x1 = 0 + (dx * i);
    var x2 = x1 + dx + 1;
    var x3 = x2 - h;
    var x4 = (x3 - dx) - 1;
    var y1 = y2 = 0;
    var y3 = y4 = h;
    var desc360 = new ActionDescriptor();
    var ref131 = new ActionReference();
    ref131.putProperty(cTID("Chnl"), sTID("selection"));
    desc360.putReference(cTID("null"), ref131);
    var desc361 = new ActionDescriptor();
    var list17 = new ActionList();
    function addPoint(x, y) {
        var desc = new ActionDescriptor();
        desc.putUnitDouble(cTID("Hrzn"), cTID("#Pxl"), x);
        desc.putUnitDouble(cTID("Vrtc"), cTID("#Pxl"), y);
        list17.putObject(cTID("Pnt "), desc);
    }
    addPoint(x1, y1);
    addPoint(x2, y2);
    addPoint(x3, y3);
    addPoint(x4, y4);
    addPoint(x1, y1);
    desc361.putList(cTID("Pts "), list17);
    desc360.putObject(cTID("T   "), cTID("Plgn"), desc361);
    executeAction(cTID("setd"), desc360, DialogModes.NO);
};

TSclass.selectEclipse = function (i, j, fwd) {
    var doc = app.activeDocument;
    var w = parseInt(doc.width);
    var h = parseInt(doc.height);
    if (i == 0) { 
        TSclass.selectRect(0, 0, w, h);
        return;
    }
    var x1 = 0 + (((i / j) * w) / 2);
    var y1 = 0 + (((i / j) * h) / 2);
    var x2 = w - (((i / j) * w) / 2);
    var y2 = h - (((i / j) * h) / 2);
    var desc832 = new ActionDescriptor();
    var ref341 = new ActionReference();
    ref341.putProperty(cTID("Chnl"), sTID("selection"));
    desc832.putReference(cTID("null"), ref341);
    var desc833 = new ActionDescriptor();
    desc833.putUnitDouble(cTID("Top "), cTID("#Pxl"), y1);
    desc833.putUnitDouble(cTID("Left"), cTID("#Pxl"), x1);
    desc833.putUnitDouble(cTID("Btom"), cTID("#Pxl"), y2);
    desc833.putUnitDouble(cTID("Rght"), cTID("#Pxl"), x2);
    desc832.putObject(cTID("T   "), cTID("Elps"), desc833);
    executeAction(cTID("setd"), desc832, DialogModes.NO);
};

TSclass.selectRadial = function(i, total) {
    var doc = app.activeDocument;
    var w = doc.width.value || parseInt(doc.width);
    var h = doc.height.value || parseInt(doc.height);
    var cx = w / 2, cy = h / 2;
    var r = Math.sqrt(cx * cx + cy * cy);
    var angleStep = 360 / total;
    var a1 = (i) * angleStep;
    var a2 = (i + 1) * angleStep;
    var p = [];
    p.push([cx, cy]);
    var steps = 16;
    for (var k = 0; k <= steps; k++) {
        var angle = a1 + (a2 - a1) * (k / steps);
        var rad = angle * Math.PI / 180;
        p.push([cx + r * Math.cos(rad), cy + r * Math.sin(rad)]);
    }
    p.push([cx, cy]);
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putProperty(cTID("Chnl"), sTID("selection"));
    desc.putReference(cTID("null"), ref);
    var polyDesc = new ActionDescriptor();
    var list = new ActionList();
    for (var k = 0; k < p.length; k++) {
        var ptDesc = new ActionDescriptor();
        ptDesc.putUnitDouble(cTID("Hrzn"), cTID("#Pxl"), p[k][0]);
        ptDesc.putUnitDouble(cTID("Vrtc"), cTID("#Pxl"), p[k][1]);
        list.putObject(cTID("Pnt "), ptDesc);
    }
    polyDesc.putList(cTID("Pts "), list);
    desc.putObject(cTID("T   "), cTID("Plgn"), polyDesc);
    executeAction(cTID("setd"), desc, DialogModes.NO);
};

TSclass.selectSpiralStripe = function (stripeIndex, numStripes, twist, w, h) {
    var cx = w / 2, cy = h / 2;
    var rMin = 0;
    var rMax = Math.sqrt(cx*cx + cy*cy);
    var steps = 80;
    var poly = [];
    for (var k = 0; k <= steps; k++) {
        var t = k / steps;
        var r = rMin + (rMax - rMin) * t;
        var baseAngle = (2 * Math.PI) * (stripeIndex / numStripes);
        var spiralAngle = baseAngle + twist * 2 * Math.PI * (r / rMax);
        poly.push([
            cx + r * Math.cos(spiralAngle),
            cy + r * Math.sin(spiralAngle)
        ]);
    }
    for (var k = steps; k >= 0; k--) {
        var t = k / steps;
        var r = rMin + (rMax - rMin) * t;
        var baseAngle = (2 * Math.PI) * ((stripeIndex + 1) / numStripes);
        var spiralAngle = baseAngle + twist * 2 * Math.PI * (r / rMax);
        poly.push([
            cx + r * Math.cos(spiralAngle),
            cy + r * Math.sin(spiralAngle)
        ]);
    }
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putProperty(cTID("Chnl"), sTID("selection"));
    desc.putReference(cTID("null"), ref);
    var polyDesc = new ActionDescriptor();
    var list = new ActionList();
    for (var p = 0; p < poly.length; p++) {
        var ptDesc = new ActionDescriptor();
        ptDesc.putUnitDouble(cTID("Hrzn"), cTID("#Pxl"), poly[p][0]);
        ptDesc.putUnitDouble(cTID("Vrtc"), cTID("#Pxl"), poly[p][1]);
        list.putObject(cTID("Pnt "), ptDesc);
    }
    polyDesc.putList(cTID("Pts "), list);
    desc.putObject(cTID("T   "), cTID("Plgn"), polyDesc);
    executeAction(cTID("setd"), desc, DialogModes.NO);
};

TSclass.maskSelection = function () {
    var desc1 = new ActionDescriptor();
    desc1.putClass(cTID("Nw  "), cTID("Chnl"));
    var ref1 = new ActionReference();
    ref1.putEnumerated(cTID("Chnl"), cTID("Chnl"), cTID("Msk "));
    desc1.putReference(cTID("At  "), ref1);
    desc1.putEnumerated(cTID("Usng"), cTID("UsrM"), cTID("RvlS"));
    executeAction(cTID("Mk  "), desc1, DialogModes.NO);
};

TSclass.addShadow = function () {
    var angle = typeof TSclass.p.shadowAngle !== "undefined" ? parseFloat(TSclass.p.shadowAngle) : 120;
    var opacity = typeof TSclass.p.shadowOpacity !== "undefined" ? parseFloat(TSclass.p.shadowOpacity) : 50;
    var dist = typeof TSclass.p.shadowDist !== "undefined" ? parseFloat(TSclass.p.shadowDist) : 5;
    var size = typeof TSclass.p.shadowSize !== "undefined" ? parseFloat(TSclass.p.shadowSize) : 5;
    var spread = typeof TSclass.p.shadowSpread !== "undefined" ? parseFloat(TSclass.p.shadowSpread) : 0;
    var colorHex = TSclass.p.shadowColor || "#000000";
    switch (TSclass.p.shadow ? TSclass.p.shadow.toLowerCase() : "no") { 
        case "no": return;
        case "forward":
            if (TSclass.p.outputPattern && TSclass.p.outputPattern.indexOf("Horizontal") > -1) { 
                angle = 90;
            } else {
                angle = 180;
            }
            break;
        case "backward":
            if (TSclass.p.outputPattern && TSclass.p.outputPattern.indexOf("Horizontal") > -1) { 
                angle = 270;
            } else {
                angle = 0;
            }
            break;
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
};

// =========================
// 6. LOG, SETTINGS, UTILS
// =========================

TSclass.getOption = function (a) {
    try {
        var desc = app.getCustomOptions(a);
        return desc.getString(0);
    } catch (e) { return false; }
};
TSclass.putOption = function (a, b) {
    var desc2 = new ActionDescriptor();
    desc2.putString(0, b, true);
    app.putCustomOptions(a, desc2, true);
};
TSclass.myAlert = function (msg, title, isErr) { TSclass.writeTextFile(msg); };
TSclass.writeTextFile = function (msg) {
    if (!TSclass.p.generateLog) return;
    var currentdate = new Date();
    var datetime = currentdate.getDate() + "/" + (currentdate.getMonth() + 1) + "/" + currentdate.getFullYear() + "@" +
        currentdate.getHours() + ":" + currentdate.getMinutes() + ":" + currentdate.getSeconds();
    var txtFile = new File(TSclass.p.outputFolder + "/log.txt");
    txtFile.open("a");
    txtFile.writeln("v17 | " + datetime + ": " + msg);
    txtFile.close();
};
TSclass.saveSettingsToFile = function (settings, file) {
    var skipKeys = { isPro: true, importFileExtensions: true, w: true, h: true, process: true, dummyText: true };
    var settingsText = "";
    for (var k in settings) {
        if (!settings.hasOwnProperty(k)) continue;
        if (skipKeys[k]) continue;
        settingsText += k + ": " + settings[k] + "\n";
    }
    file.open("w");
    file.write(settingsText);
    file.close();
    alert("Settings saved to:\n" + decodeURI(file.fsName));
    return true;
};
TSclass.vc = function () { return true; };

// =========================
// 7. DIALOG & GUI
// =========================
// =========================
// 7. DIALOG & GUI (CONTINUAZIONE)
// =========================

TSclass.dialogAndSetOptions = function () {
    var prefs = TSclass.p;
    var myWin = new Window("dialog", "TimeSlicerPro v17");

    // INPUT PANEL
    myWin.InputPanel = myWin.add("panel", undefined, "Input Folder");
    var InputPanelGroup = myWin.InputPanel.add("group", undefined, "");
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

    // OUTPUT PANEL
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

    // OUTPUT FILE & TYPE
    var OutputPanelGroup2 = myWin.SettingsPanel.add("group", undefined, "");
    OutputPanelGroup2.alignment = [ScriptUI.Alignment.LEFT, ScriptUI.Alignment.TOP];
    var OutputLabel2 = OutputPanelGroup2.add("statictext", undefined, "Output File");
    OutputLabel2.size = [100, 20];
    var OutputFile = OutputPanelGroup2.add("edittext", undefined, prefs.outputFile || "TSP-result");
    OutputFile.characters = 30;
    var OutputFileType = OutputPanelGroup2.add("DropDownList", undefined, ["JPG", "PNG"]);
    OutputFileType.selection = (prefs.outputType && prefs.outputType.toLowerCase() === "png") ? 1 : 0;

    // OUTPUT PATTERN
    var OutputPanelGroup3 = myWin.SettingsPanel.add("group", undefined, "");
    OutputPanelGroup3.alignment = [ScriptUI.Alignment.LEFT, ScriptUI.Alignment.TOP];
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
        "Spiral Stripes"
    ]);
    var patternIndex = 0;
    for (var j = 0; j < OutputPattern.items.length; j++)
        if (OutputPattern.items[j].text === (prefs.outputPattern || "")) patternIndex = j;
    OutputPattern.selection = patternIndex;

    // RADIAL ORDER
    var radialOrderGroup = OutputPanelGroup3.add("group", undefined, "");
    radialOrderGroup.alignment = [ScriptUI.Alignment.LEFT, ScriptUI.Alignment.TOP];
    var radialOrderLabel = radialOrderGroup.add("statictext", undefined, "Radial order:");
    radialOrderLabel.size = [80, 20];
    var radialOrderDropdown = radialOrderGroup.add("dropdownlist", undefined, ["From Center", "From Edge"]);
    radialOrderDropdown.selection = (prefs.radialOrder && prefs.radialOrder === "edge") ? 1 : 0;
    radialOrderGroup.visible = OutputPattern.selection && OutputPattern.selection.text.indexOf("Radial") === 0;
    OutputPattern.onChange = function () {
        radialOrderGroup.visible = this.selection && this.selection.text.indexOf("Radial") === 0;
        spiralPanel.visible = this.selection && this.selection.text == "Spiral Stripes";
        myWin.layout.layout(true);
        myWin.update();
    };

    // SPIRAL PANEL
    var spiralPanel = myWin.SettingsPanel.add("panel", undefined, "Spiral Stripes Options");
    spiralPanel.orientation = "row";
    spiralPanel.alignChildren = "left";

    var spiralNumGroup = spiralPanel.add("group");
    spiralNumGroup.add("statictext", undefined, "Number of Stripes:");
    var spiralNumSlider = spiralNumGroup.add("slider", undefined, parseInt(prefs.spiralStripesNum) || 12, 2, 64);
    spiralNumSlider.preferredSize.width = 120;
    var spiralNumValue = spiralNumGroup.add("statictext", undefined, (parseInt(prefs.spiralStripesNum) || 12).toString());
    spiralNumSlider.onChanging = function () {
        spiralNumValue.text = Math.round(spiralNumSlider.value).toString();
    };

    var spiralTwistGroup = spiralPanel.add("group");
    spiralTwistGroup.add("statictext", undefined, "Twist:");
    var spiralTwistSlider = spiralTwistGroup.add("slider", undefined, parseInt(prefs.stripeTwist) || 4, 0, 12);
    spiralTwistSlider.preferredSize.width = 120;
    var spiralTwistValue = spiralTwistGroup.add("statictext", undefined, (parseInt(prefs.stripeTwist) || 4).toString());
    spiralTwistSlider.onChanging = function () {
        spiralTwistValue.text = Math.round(spiralTwistSlider.value).toString();
    };

    spiralPanel.visible = OutputPattern.selection && OutputPattern.selection.text == "Spiral Stripes";

    // SHADOW PANEL
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

    var opacityGroup = shadowPanel.add("group");
    opacityGroup.add("statictext", undefined, "Opacity:");
    var opacitySlider = opacityGroup.add("slider", undefined, parseInt(prefs.shadowOpacity) || 50, 1, 100);
    var opacityValue = opacityGroup.add("statictext", undefined, (parseInt(prefs.shadowOpacity) || 50) + "%");
    opacitySlider.onChanging = function () {
        opacityValue.text = Math.round(opacitySlider.value) + "%";
    };

    var angleGroup = shadowPanel.add("group");
    angleGroup.add("statictext", undefined, "Angle:");
    var angleSlider = angleGroup.add("slider", undefined, parseInt(prefs.shadowAngle) || 120, 0, 360);
    var angleValue = angleGroup.add("statictext", undefined, (parseInt(prefs.shadowAngle) || 120) + "°");
    angleSlider.onChanging = function () {
        angleValue.text = Math.round(angleSlider.value) + "°";
    };

    var distanceGroup = shadowPanel.add("group");
    distanceGroup.add("statictext", undefined, "Distance:");
    var distanceSlider = distanceGroup.add("slider", undefined, parseInt(prefs.shadowDist) || 5, 0, 100);
    var distanceValue = distanceGroup.add("statictext", undefined, (parseInt(prefs.shadowDist) || 5) + " px");
    distanceSlider.onChanging = function () {
        distanceValue.text = Math.round(distanceSlider.value) + " px";
    };

    var blurGroup = shadowPanel.add("group");
    blurGroup.add("statictext", undefined, "Blur:");
    var blurSlider = blurGroup.add("slider", undefined, parseInt(prefs.shadowSize) || 5, 0, 100);
    var blurValue = blurGroup.add("statictext", undefined, (parseInt(prefs.shadowSize) || 5) + " px");
    blurSlider.onChanging = function () {
        blurValue.text = Math.round(blurSlider.value) + " px";
    };

    var spreadGroup = shadowPanel.add("group");
    spreadGroup.add("statictext", undefined, "Spread:");
    var spreadSlider = spreadGroup.add("slider", undefined, parseInt(prefs.shadowSpread) || 0, 0, 100);
    var spreadValue = spreadGroup.add("statictext", undefined, (parseInt(prefs.shadowSpread) || 0) + " px");
    spreadSlider.onChanging = function () {
        spreadValue.text = Math.round(spreadSlider.value) + " px";
    };

    // LOG CHECKBOX
    var logGroup = myWin.add("group", undefined, "");
    logGroup.orientation = "row";
    var logCheckbox = logGroup.add("checkbox", undefined, "Generate LOG file");
    logCheckbox.value = prefs.generateLog || false;
    logCheckbox.helpTip = "If checked, a log file of the operations will be created.";

    // BUTTONS GROUP
    var Button_Group = myWin.add("group", undefined, "");
    Button_Group.orientation = "row";
    Button_Group.okBtn = Button_Group.add("button", undefined, "Time Slice It !", { name: "ok" });
    Button_Group.okBtn.size = [200, 40];
    Button_Group.cancelBtn = Button_Group.add("button", undefined, "Cancel", { name: "cancel" });
    Button_Group.cancelBtn.size = [100, 40];
    Button_Group.saveSettingsBtn = Button_Group.add("button", undefined, "Save Settings");
    Button_Group.saveSettingsBtn.size = [110, 40];
    Button_Group.loadSettingsBtn = Button_Group.add("button", undefined, "Load Settings");
    Button_Group.loadSettingsBtn.size = [110, 40];

    Button_Group.saveSettingsBtn.onClick = function () {
        TSclass.p.inputFolder    = Input1Edit.text;
        TSclass.p.outputFolder   = OutputFolder.text;
        TSclass.p.outputFile     = OutputFile.text;
        TSclass.p.outputType     = OutputFileType.selection ? OutputFileType.selection.text.toLowerCase() : "jpg";
        TSclass.p.outputPattern  = OutputPattern.selection ? OutputPattern.selection.text : "Horizontal Slices Top To Bottom";
        TSclass.p.outputQuality  = 12;
        TSclass.p.shadow         = shadowDropdown.selection ? shadowDropdown.selection.text.toLowerCase() : "no";
        TSclass.p.shadowColor    = colorInput.text;
        TSclass.p.shadowOpacity  = Math.round(opacitySlider.value);
        TSclass.p.shadowAngle    = Math.round(angleSlider.value);
        TSclass.p.shadowDist     = Math.round(distanceSlider.value);
        TSclass.p.shadowSize     = Math.round(blurSlider.value);
        TSclass.p.shadowSpread   = Math.round(spreadSlider.value);
        TSclass.p.radialOrder    = radialOrderDropdown.selection ? (radialOrderDropdown.selection.index === 1 ? "edge" : "center") : "center";
        TSclass.p.stripeTwist    = Math.round(spiralTwistSlider.value);
        TSclass.p.spiralStripesNum = Math.round(spiralNumSlider.value);
        TSclass.p.generateLog    = logCheckbox.value ? true : false;

        var folder = Folder("~/Documents/tsp/");
        if (!folder.exists) folder.create();
        var fileName = "TimeSlicerPro-settings_" + getNowTimestamp() + ".txt";
        var file = new File(folder.fsName + "/" + fileName);

        TSclass.saveSettingsToFile(TSclass.p, file);
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
            TSclass.p[key] = value;
        }
        try {
            Input1Edit.text = TSclass.p.inputFolder || "";
            OutputFolder.text = TSclass.p.outputFolder || "";
            OutputFile.text = TSclass.p.outputFile || "";
            if (OutputFileType && TSclass.p.outputType) {
                OutputFileType.selection = (TSclass.p.outputType.toLowerCase() === "png") ? 1 : 0;
            }
            if (OutputPattern && TSclass.p.outputPattern) {
                for (var j = 0; j < OutputPattern.items.length; j++) {
                    if (OutputPattern.items[j].text === TSclass.p.outputPattern) {
                        OutputPattern.selection = j;
                        break;
                    }
                }
                radialOrderGroup.visible = OutputPattern.selection && OutputPattern.selection.text.indexOf("Radial") === 0;
                spiralPanel.visible = OutputPattern.selection && OutputPattern.selection.text == "Spiral Stripes";
            }
            if (radialOrderDropdown && TSclass.p.radialOrder) {
                radialOrderDropdown.selection = (TSclass.p.radialOrder === "edge") ? 1 : 0;
            }
            if (shadowDropdown && TSclass.p.shadow) {
                var selIdx = 0;
                if (TSclass.p.shadow.toLowerCase() === "forward") selIdx = 1;
                else if (TSclass.p.shadow.toLowerCase() === "backward") selIdx = 2;
                shadowDropdown.selection = selIdx;
            }
            colorInput.text = TSclass.p.shadowColor || "#000000";
            if (opacitySlider && TSclass.p.shadowOpacity !== undefined) opacitySlider.value = Number(TSclass.p.shadowOpacity);
            if (angleSlider && TSclass.p.shadowAngle !== undefined) angleSlider.value = Number(TSclass.p.shadowAngle);
            if (distanceSlider && TSclass.p.shadowDist !== undefined) distanceSlider.value = Number(TSclass.p.shadowDist);
            if (blurSlider && TSclass.p.shadowSize !== undefined) blurSlider.value = Number(TSclass.p.shadowSize);
            if (spreadSlider && TSclass.p.shadowSpread !== undefined) spreadSlider.value = Number(TSclass.p.shadowSpread);
            if (opacityValue) opacityValue.text = Math.round(opacitySlider.value) + "%";
            if (angleValue) angleValue.text = Math.round(angleSlider.value) + "°";
            if (distanceValue) distanceValue.text = Math.round(distanceSlider.value) + " px";
            if (blurValue) blurValue.text = Math.round(blurSlider.value) + " px";
            if (spreadValue) spreadValue.text = Math.round(spreadSlider.value) + " px";
            spiralTwistSlider.value = Number(TSclass.p.stripeTwist) || 4;
            spiralTwistValue.text = Math.round(spiralTwistSlider.value).toString();
            spiralNumSlider.value = Number(TSclass.p.spiralStripesNum) || 12;
            spiralNumValue.text = Math.round(spiralNumSlider.value).toString();
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
        TSclass.p.process = false;
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
        TSclass.p.inputFolder = Input1Edit.text;
        TSclass.p.outputFolder = OutputFolder.text;
        TSclass.p.outputFile = OutputFile.text;
        TSclass.p.outputType = OutputFileType.selection.text.toLowerCase();
        TSclass.p.outputPattern = OutputPattern.selection.text;
        TSclass.p.shadow = shadowDropdown.selection.text.toLowerCase();
        TSclass.p.shadowColor = colorInput.text;
        TSclass.p.shadowOpacity = Math.round(opacitySlider.value);
        TSclass.p.shadowAngle = Math.round(angleSlider.value);
        TSclass.p.shadowDist = Math.round(distanceSlider.value);
        TSclass.p.shadowSize = Math.round(blurSlider.value);
        TSclass.p.shadowSpread = Math.round(spreadSlider.value);
        TSclass.p.radialOrder = radialOrderDropdown.selection ? (radialOrderDropdown.selection.index === 1 ? "edge" : "center") : "center";
        TSclass.p.generateLog = logCheckbox.value ? true : false;
        TSclass.p.stripeTwist = Math.round(spiralTwistSlider.value);
        TSclass.p.spiralStripesNum = Math.round(spiralNumSlider.value);

        // PATCH v17: salva impostazioni sempre all'ok!
        TSclass.saveLastSettings(TSclass.p);

        TSclass.p.process = true;
        myWin.close();
    };

    // CREDIT PANEL
    myWin.CreditPanel = myWin.add("panel", undefined, "TimeSlicerPro:");
    var CreditText = myWin.CreditPanel.add("group", undefined, "");
    var CreditTextLabel = CreditText.add("statictext", undefined, "CapZicco | Email: capzicco@gmail.com", { multiline: true });
    CreditTextLabel.graphics.font = "Verdana-bold:12";
    CreditTextLabel.size = [430, 20];

    myWin.center();
    myWin.show();
};

// =========================
// 8. ENTRYPOINT
// =========================

var myClass = new TSclass();
myClass.main();

/**
 * FINE SCRIPT.
 * - Nessun azzeramento settings, autosalvataggio e ricarica trasparente dell'ultimo set usato.
 */