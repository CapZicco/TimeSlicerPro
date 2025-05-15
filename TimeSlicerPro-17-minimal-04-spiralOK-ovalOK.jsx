/*
 * TimeSlicerPro MINIMAL PATCHED (OVAL/SPIRAL/LAYER FIX)
 *
 * - Solo funzioni essenziali (no extra, no EXIF, no batch, no preset)
 * - Fix OVAL: Outside-In ora funziona (ordine layer corretto)
 * - Fix SPIRAL: selezione robusta
 * - Merge solo se >1 layer (mai errore)
 * - Nessun layer bianco, nessun post-process, solo slicing puro
 * - GUI essenziale
 */

(function() {

// --- UTILS ---
var cTID = function (s) { return app.charIDToTypeID(s); };
var sTID = function (s) { return app.stringIDToTypeID(s); };

function getMyFiles(sourceFolder, extList) {
    var fileArray = [];
    var t = Folder(sourceFolder);
    var docs = t.getFiles().sort();
    for (var i = 0; i < docs.length; i++) {
        var doc = docs[i];
        if (doc instanceof File && doc.name.match(eval(extList))) fileArray.push(doc);
    }
    return fileArray;
}
function openFile(path) { return app.open(File(path)); }
function closeFile(doc, how) {
    switch (how) {
        case "save": doc.close(SaveOptions.SAVECHANGES); break;
        case "nosave": doc.close(SaveOptions.DONOTSAVECHANGES); break;
        default: doc.close(SaveOptions.PROMPTTOSAVECHANGES); break;
    }
}
function duplicateLayersInto(targetDoc, placement) {
    for (var z = app.activeDocument.artLayers.length - 1; z >= 0; z--) {
        var al = app.activeDocument.artLayers[z];
        al.duplicate(targetDoc, placement);
    }
}
function saveImageJPG(folder, name, quality) {
    var file = new File(folder + "/" + name + ".jpg");
    var opts = new JPEGSaveOptions();
    opts.quality = quality || 12;
    app.activeDocument.saveAs(file, opts, true);
    return file.fsName;
}

// --- SELEZIONI ---
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
// OVAL v13
function selectEclipse(i, j) {
    var doc = app.activeDocument;
    var w = parseInt(doc.width);
    var h = parseInt(doc.height);
    if (i == 0) { selectRect(0, 0, w, h); return; }
    var x1 = 0 + (((i / j) * w) / 2);
    var y1 = 0 + (((i / j) * h) / 2);
    var x2 = w - (((i / j) * w) / 2);
    var y2 = h - (((i / j) * h) / 2);
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
// SPIRAL v15
function selectSpiralStripe(stripeIndex, numStripes, twist, w, h) {
    var cx = w / 2, cy = h / 2, rMin = 0, rMax = Math.sqrt(cx * cx + cy * cy), steps = 80, poly = [];
    for (var k = 0; k <= steps; k++) {
        var t = k / steps, r = rMin + (rMax - rMin) * t;
        var baseAngle = (2 * Math.PI) * (stripeIndex / numStripes);
        var spiralAngle = baseAngle + twist * 2 * Math.PI * (r / rMax);
        poly.push([cx + r * Math.cos(spiralAngle), cy + r * Math.sin(spiralAngle)]);
    }
    for (var k = steps; k >= 0; k--) {
        var t = k / steps, r = rMin + (rMax - rMin) * t;
        var baseAngle = (2 * Math.PI) * ((stripeIndex + 1) / numStripes);
        var spiralAngle = baseAngle + twist * 2 * Math.PI * (r / rMax);
        poly.push([cx + r * Math.cos(spiralAngle), cy + r * Math.sin(spiralAngle)]);
    }
    var desc = new ActionDescriptor(), ref = new ActionReference();
    ref.putProperty(cTID("Chnl"), sTID("selection")); desc.putReference(cTID("null"), ref);
    var polyDesc = new ActionDescriptor(), list = new ActionList();
    for (var p = 0; p < poly.length; p++) {
        var ptDesc = new ActionDescriptor();
        ptDesc.putUnitDouble(cTID("Hrzn"), cTID("#Pxl"), poly[p][0]);
        ptDesc.putUnitDouble(cTID("Vrtc"), cTID("#Pxl"), poly[p][1]);
        list.putObject(cTID("Pnt "), ptDesc);
    }
    polyDesc.putList(cTID("Pts "), list);
    desc.putObject(cTID("T   "), cTID("Plgn"), polyDesc);
    executeAction(cTID("setd"), desc, DialogModes.NO);
}
function maskSelection() {
    var desc = new ActionDescriptor();
    desc.putClass(cTID("Nw  "), cTID("Chnl"));
    var ref = new ActionReference();
    ref.putEnumerated(cTID("Chnl"), cTID("Chnl"), cTID("Msk "));
    desc.putReference(cTID("At  "), ref);
    desc.putEnumerated(cTID("Usng"), cTID("UsrM"), cTID("RvlS"));
    executeAction(cTID("Mk  "), desc, DialogModes.NO);
}

// --- GUI MINIMALE ---
function showDialog(settings) {
    var dlg = new Window('dialog', 'TimeSlicerPro MINIMAL');
    dlg.alignChildren = "fill";
    var inG = dlg.add("group"); inG.add("statictext", undefined, "Input:"); 
    var inFld = inG.add("edittext", undefined, settings.inputFolder); inFld.characters=35;
    var inBtn = inG.add("button", undefined, "...");
    inBtn.onClick = function() { var f = Folder.selectDialog("Seleziona cartella immagini"); if(f) inFld.text=f.fsName; };
    var outG = dlg.add("group"); outG.add("statictext", undefined, "Output:"); 
    var outFld = outG.add("edittext", undefined, settings.outputFolder); outFld.characters=35;
    var outBtn = outG.add("button", undefined, "...");
    outBtn.onClick = function() { var f = Folder.selectDialog("Seleziona cartella output"); if(f) outFld.text=f.fsName; };
    var pattG = dlg.add("group");
    pattG.add("statictext", undefined, "Pattern:");
    var pattDrop = pattG.add("dropdownlist", undefined, [ "Vertical", "Horizontal", "Oval Outside-In", "Oval Inside-Out", "Spiral" ]); pattDrop.selection=0;
    for(var i=0;i<pattDrop.items.length;i++){ if(pattDrop.items[i].text===settings.pattern){pattDrop.selection=i;} }
    var qG = dlg.add("group"); qG.add("statictext", undefined, "Quality:"); 
    var qFld = qG.add("edittext", undefined, settings.quality||12); qFld.characters=3;
    var okBtn = dlg.add("button", undefined, "OK");
    okBtn.onClick = function() {
        settings.inputFolder = inFld.text;
        settings.outputFolder = outFld.text;
        settings.pattern = pattDrop.selection.text;
        settings.quality = parseInt(qFld.text,10)||12;
        settings.process = true;
        dlg.close();
    };
    dlg.center(); dlg.show();
}

// --- MAIN ---
function main() {
    var settings = { inputFolder: "~", outputFolder: "~", pattern: "Vertical", quality: 12 };
    showDialog(settings);
    if (!settings.process) return;
    while (app.documents.length) app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);

    var files = getMyFiles(settings.inputFolder, "/.(?:.jpg)$/i");
    if (files.length < 2) { alert("Servono almeno 2 immagini JPG."); return; }
    var newFile;
    for (var i = 0; i < files.length; i++) {
        var doc = openFile(files[i].fsName);
        if (i == 0) {
            newFile = doc.duplicate();
            var w = newFile.width.value || parseInt(newFile.width), h = newFile.height.value || parseInt(newFile.height);
        } else {
            // PATCH: placement OVAL Outside-In
            var placement = ElementPlacement.PLACEATEND;
            if (settings.pattern === "Oval Outside-In") placement = ElementPlacement.PLACEATBEGINNING;
            duplicateLayersInto(newFile, placement);
        }
        closeFile(doc, "nosave");

        // Selezione e maschera
        switch (settings.pattern) {
            case "Vertical":
                var x1 = w * (i / files.length), x2 = w * ((i+1)/files.length);
                selectRect(x1, 0, x2, h); break;
            case "Horizontal":
                var y1 = h * (i / files.length), y2 = h * ((i+1)/files.length);
                selectRect(0, y1, w, y2); break;
            case "Oval Outside-In":
                selectEclipse(i, files.length); break;
            case "Oval Inside-Out":
                selectEclipse(files.length - (i + 1), files.length); break;
            case "Spiral":
                selectSpiralStripe(i, files.length, 4, w, h); break;
        }
        maskSelection();

        // Merge solo se almeno 2 layer
        if (newFile.layers.length > 1) newFile.mergeVisibleLayers();
    }
    var outName = "TSP_" + new Date().getTime();
    var saved = saveImageJPG(settings.outputFolder, outName, settings.quality);

    while (app.documents.length) app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
    alert("Finito!\nSalvato: "+saved, "TSP Minimal");
}

main();
})();
