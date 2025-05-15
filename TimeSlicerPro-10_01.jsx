/*
 * TimeSlicerPro v10.01)
 * load/save settings 
 * by CapZicco & Copilot
 */

// =========================
// 1. FUNZIONI UTILITY FILESYSTEM E DOCUMENTI
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
function closeFileWithoutSave(fileRef) {
    fileRef.close(SaveOptions.DONOTSAVECHANGES);
}
function closeFileWithSave(fileRef) {
    fileRef.close(SaveOptions.SAVECHANGES);
}
function closeFile(fileRef) {
    fileRef.close(SaveOptions.PROMPTTOSAVECHANGES);
}
function revertFile(fileRef) {
    fileRef.activeHistoryState = fileRef.historyStates[0];
}
function SaveAsJPEG(folder, fileName, outputQuality) {
    var jpegOptions = new JPEGSaveOptions();
    jpegOptions.quality = outputQuality;
    jpegOptions.embedColorProfile = true;
    var jpegExtension = "jpg";
    var thisFile = getFileWithPath(folder, fileName, jpegExtension);
    activeDocument.saveAs(File(thisFile), jpegOptions, true);
    return thisFile;
}
function getFileWithPath(folder, fileName, ext) {
    return folder + "/" + fileName + "." + ext.toLowerCase();
}
function SaveAsPng(folder, fileName) {
    var thisFile = getFileWithPath(folder, fileName, "png");
    var opts = new PNGSaveOptions();
    opts.format = SaveDocumentType.PNG;
    opts.transparency = true;
    opts.PNGB = false;
    opts.quality = 100;
    opts.includeProfile = true;
    activeDocument.saveAs(File(thisFile), opts, true, Extension.LOWERCASE);
}
function duplicateLayersInto(folderRef) {
    for (var z = app.activeDocument.artLayers.length - 1; z >= 0; z--) { 
        var al = app.activeDocument.artLayers[z];
        switch (TSclass.p.outputPattern) { 
            case "Oval-Circular Slices Outside-In":
                al.duplicate(folderRef, ElementPlacement.PLACEATBEGINNING);
                break;
            case "Oval-Circular Slices Inside-Out":
                al.duplicate(folderRef, ElementPlacement.PLACEATEND);
                break;
            case "Horizontal Slices Bottom To Top":
            case "Vertical Slices Right To Left":
            case "Diagonal 45 degrees Right To Left":
            case "Diagonal Slices Right To Left":
                if (TSclass.p.shadow.toLowerCase() == "forward") {
                    al.duplicate(folderRef, ElementPlacement.PLACEATBEGINNING);
                } else {
                    al.duplicate(folderRef, ElementPlacement.PLACEATEND);
                }
                break;
            case "Horizontal Slices Top To Bottom":
            case "Vertical Slices Left To Right":
            case "Diagonal 45 degrees Left To Right":
            case "Diagonal Slices Left To Right":
                if (TSclass.p.shadow.toLowerCase() == "forward") {
                    al.duplicate(folderRef, ElementPlacement.PLACEATEND);
                } else {
                    al.duplicate(folderRef, ElementPlacement.PLACEATBEGINNING);
                }
                break;
        }
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
// 2. DEFINIZIONE CLASSE PRINCIPALE ED ENTRYPOINT
// =========================

var tsVersion = "1.90-EV";

var TSclass = function () {};

TSclass.prototype.main = function () {
    if (app.documents.length) {
        alert("Please close all images and keep stage empty\n\nTry again.", " Close All Open Files");
        return;
    }
    preferences.rulerUnits = Units.PIXELS;
    TSclass.setPreferences();
    TSclass.dialogAndSetOptions();
    if (TSclass.p.process) {
        TSclass.SliceIt();
    } else {
        TSclass.userAbort();
    }
};

TSclass.closeAll = function () {
    while (filesOpenCount()) {
        closeFileWithoutSave(app.activeDocument);
    }
};
TSclass.SliceIt = function () {
    TSclass.myAlert("---------------> SLICING <---------------");
    TSclass.myAlert("Shadow setting is " + TSclass.p.shadow.toLowerCase());
    var files = getMyFiles(TSclass.p.inputFolder, TSclass.p.importFileExtensions || "/.(?:.jpg)$/i");
    var len = files.length;
    var newFile;
    for (var i = 0; i < len; i++) {
        TSclass.myAlert("trying to open  file " + files[i].name);
        var processingFile = openFile(files[i].path + "/" + files[i].name);
        TSclass.myAlert("open  file " + files[i].name);
        if (!TSclass.vc()) {
            TSclass.closeAll();
            return false;
        }
        var thisName = processingFile.name;
        if (i == 0) {
            TSclass.myAlert("This is the first image");
            newFile = processingFile.duplicate();
            TSclass.p.w = newFile.width.value;
            TSclass.p.h = newFile.height.value;
        } else {
            if ((TSclass.p.w == processingFile.width) && (TSclass.p.h == processingFile.height)) {
                TSclass.myAlert("D");
                duplicateLayersInto(newFile);
            } else {
                TSclass.myAlert("image size mismatched");
                alert("Image " + processingFile.name + " not of same size as first, IGNORING");
            }
        }
        closeFileWithoutSave(processingFile);
        newFile.activeLayer.name = thisName.slice(0, -4);
        TSclass.maskIt(i, len);
        TSclass.myAlert("M");
        var newLayerRef = app.activeDocument.artLayers.add();
        switch (TSclass.p.shadow.toLowerCase()) {
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
    if (TSclass.p.outputType.toLowerCase() == "jpg") {
        TSclass.myAlert("JPG");
        SaveAsJPEG(TSclass.p.outputFolder, TSclass.p.outputFile, TSclass.p.outputQuality);
    } else {
        TSclass.myAlert("PNG");
        SaveAsPng(TSclass.p.outputFolder, TSclass.p.outputFile);
    }
    TSclass.myAlert("Saved >>>" + TSclass.p.outputFile);
    TSclass.myAlert("Done, closing and saving");
    closeFileWithoutSave(newFile);
    var f = new File(getFileWithPath(TSclass.p.outputFolder, TSclass.p.outputFile, TSclass.p.outputType));
    TSclass.myAlert("---------------> DONE <---------------");
    alert("Done!\nCheck your work\n\n\n" + TSclass.p.outputFolder, "www.flickr.com/photos/luca-aka-zicco/", false);
};
TSclass.maskIt = function (i, len) {
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
        case "Radial":
            alert("to do");
            break;
        case "Circular":
            break;
    }
    TSclass.maskSelection();
    TSclass.addShadow();
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
TSclass.setPreferences = function () {
    TSclass.p = new Object();
    TSclass.p.inputFolder = "~";
    TSclass.p.outputFolder = "~";
    TSclass.p.outputFile = "output";
    TSclass.p.outputType = "jpg";
    TSclass.p.outputPattern = "Vertical Slices Left To Right";
    TSclass.p.outputQuality = 12;
    TSclass.p.shadow = "no";
    TSclass.p.shadowOpacity = 10;
    TSclass.p.shadowDist = 5;
    TSclass.p.shadowSpread = 0;
    TSclass.p.shadowSize = 5;
    TSclass.p.shadowAngle = 120;
    TSclass.p.shadowColor = "#000000";
    TSclass.p.importFileExtensions = "/.(?:.jpg)$/i";
    TSclass.p.dummyText = "";
    TSclass.userAbort = function () {
        alert("Process aborted by the user.");
        return;
    };
};

// =========================
// 3. DIALOGHI E UI PRINCIPALE (GUI patchata: tutti i campi input/output sono EDITTEXT!)
// =========================

TSclass.dialogAndSetOptions = function () {
    var prefs = TSclass.p;
    var myWin = new Window("dialog", "TimeSlicerPro v" + tsVersion);

    // --- INPUT PANEL ---
    myWin.InputPanel = myWin.add("panel", undefined, "Input Folder");
    var InputPanelGroup = myWin.InputPanel.add("group", undefined, "");
    InputPanelGroup.orientation = "row";
    InputPanelGroup.alignment = [ScriptUI.Alignment.LEFT, ScriptUI.Alignment.TOP];

    var t = TSclass.getOption("inputFolder_101");
    var v1 = t ? t : "";
    var Input1Edit = InputPanelGroup.add("edittext", undefined, v1);
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
    var h1 = InputPanelGroup.add("statictext", undefined, "?");
    h1.size = [10, 20];
    h1.graphics.font = "Verdana-bold:12";
    Input1ChooseButton.helpTip = h1.helpTip = "Select the folder with images to process. All JPGs will be processed.";
    Input1ChooseButton.onClick = function () {
        var t = Folder.selectDialog("Select your input folder", Input1Edit.text);
        var dirName = decodeURI((t + "").replace(/.*[\/\\]/, ''));
        if (!OutputFile.text || OutputFile.text === "TSP-result" || OutputFile.text === "") {
            OutputFile.text = "TSP-" + dirName;
        }
        if (t && t.toString().length) {
            Input1Edit.text = t;
            updateImageCount(t);
        }
    };

    // --- OUTPUT PANEL ---
    myWin.SettingsPanel = myWin.add("panel", undefined, "Output Settings");
    var OutputPanelGroup = myWin.SettingsPanel.add("group", undefined, "");
    var OutputLabel = OutputPanelGroup.add("statictext", undefined, "Output Folder");
    OutputLabel.size = [100, 20];
    var t = TSclass.getOption("outputFolder_101");
    var v2 = t ? t : "";
    var OutputFolder = OutputPanelGroup.add("edittext", undefined, v2);
    OutputFolder.characters = 30;
    var Output2ChooseButton = OutputPanelGroup.add("button", undefined, "...");
    Output2ChooseButton.onClick = function () {
        var t = Folder.selectDialog("Select your output folder", v2);
        if (t && t.toString().length) {
            OutputFolder.text = t;
        }
    };
    Output2ChooseButton.size = [50, 20];
    var h2 = OutputPanelGroup.add("statictext", undefined, "?");
    h2.size = [10, 20];
    h2.graphics.font = "Verdana-bold:12";
    OutputFolder.helpTip = OutputLabel.helpTip = Output2ChooseButton.helpTip = h2.helpTip = "Select the folder where the final result will be saved.";

    // OUTPUT FILE & TYPE
    var OutputPanelGroup2 = myWin.SettingsPanel.add("group", undefined, "");
    OutputPanelGroup2.alignment = [ScriptUI.Alignment.LEFT, ScriptUI.Alignment.TOP];
    var OutputLabel2 = OutputPanelGroup2.add("statictext", undefined, "Output File");
    OutputLabel2.size = [100, 20];
    var t = TSclass.getOption("outputFile_101");
    var v3 = t ? t : "TSP-result";
    var OutputFile = OutputPanelGroup2.add("edittext", undefined, v3);
    OutputFile.characters = 30;
    var OutputFileType = OutputPanelGroup2.add("DropDownList", undefined, "");
    OutputFileType.add("item", "JPG");
    OutputFileType.add("item", "PNG");
    switch (TSclass.getOption("outputType_101")) {
        case "png":
        case "PNG":
            OutputFileType.selection = 1;
            break;
        default:
            OutputFileType.selection = 0;
            break;
    }
    var h3 = OutputPanelGroup2.add("statictext", undefined, "?");
    h3.size = [10, 20];
    h3.graphics.font = "Verdana-bold:12";
    OutputLabel2.helpTip = OutputFileType.helpTip = OutputFile.helpTip = h3.helpTip = "Select the output filename and extension.";

    // OUTPUT PATTERN
    var OutputPanelGroup3 = myWin.SettingsPanel.add("group", undefined, "");
    OutputPanelGroup3.alignment = [ScriptUI.Alignment.LEFT, ScriptUI.Alignment.TOP];
    var OutputLabel3 = OutputPanelGroup3.add("statictext", undefined, "Output Pattern");
    OutputLabel3.size = [100, 20];
    var OutputPattern = OutputPanelGroup3.add("DropDownList", undefined, "");
    OutputPattern.size = [300, 20];
    var outPatArr = [
        "Horizontal Slices Top To Bottom",
        "Horizontal Slices Bottom To Top",
        "Vertical Slices Left To Right",
        "Vertical Slices Right To Left",
        "Diagonal Slices Left To Right",
        "Diagonal Slices Right To Left",
        "Oval-Circular Slices Outside-In",
        "Oval-Circular Slices Inside-Out"
    ];
    for (var j = 0; j < outPatArr.length; j++) {
        OutputPattern.add("item", outPatArr[j]);
        if (outPatArr[j] == TSclass.getOption("outputPattern_101")) {
            OutputPattern.selection = j;
        }
    }
    var h4 = OutputPanelGroup3.add("statictext", undefined, "?");
    h4.size = [10, 20];
    h4.graphics.font = "Verdana-bold:12";
    OutputLabel3.helpTip = OutputPattern.helpTip = h4.helpTip = "Choose the output pattern.";

    // --- SHADOW PANEL ---
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
    var opacitySlider = opacityGroup.add("slider", undefined, prefs.shadowOpacity || 50, 1, 100);
    var opacityValue = opacityGroup.add("statictext", undefined, (prefs.shadowOpacity || 50) + "%");
    opacitySlider.onChanging = function () {
        opacityValue.text = Math.round(opacitySlider.value) + "%";
    };

    var angleGroup = shadowPanel.add("group");
    angleGroup.add("statictext", undefined, "Angle:");
    var angleSlider = angleGroup.add("slider", undefined, prefs.shadowAngle || 120, 0, 360);
    var angleValue = angleGroup.add("statictext", undefined, (prefs.shadowAngle || 120) + " deg");
    angleSlider.onChanging = function () {
        angleValue.text = Math.round(angleSlider.value) + "°";
    };

    var distanceGroup = shadowPanel.add("group");
    distanceGroup.add("statictext", undefined, "Distance:");
    var distanceSlider = distanceGroup.add("slider", undefined, prefs.shadowDist || 5, 0, 100);
    var distanceValue = distanceGroup.add("statictext", undefined, (prefs.shadowDist || 5) + " px");
    distanceSlider.onChanging = function () {
        distanceValue.text = Math.round(distanceSlider.value) + " px";
    };

    var blurGroup = shadowPanel.add("group");
    blurGroup.add("statictext", undefined, "Blur:");
    var blurSlider = blurGroup.add("slider", undefined, prefs.shadowSize || 5, 0, 100);
    var blurValue = blurGroup.add("statictext", undefined, (prefs.shadowSize || 5) + " px");
    blurSlider.onChanging = function () {
        blurValue.text = Math.round(blurSlider.value) + " px";
    };

    var spreadGroup = shadowPanel.add("group");
    spreadGroup.add("statictext", undefined, "Spread:");
    var spreadSlider = spreadGroup.add("slider", undefined, prefs.shadowSpread || 0, 0, 100);
    var spreadValue = spreadGroup.add("statictext", undefined, (prefs.shadowSpread || 0) + " px");
    spreadSlider.onChanging = function () {
        spreadValue.text = Math.round(spreadSlider.value) + " px";
    };

    // --- BUTTONS GROUP ---
    var Button_Group = myWin.add("group", undefined, "");
    Button_Group.orientation = "row";
    Button_Group.okBtn = Button_Group.add("button", undefined, "Time Slice It !", { name: "ok" });
    Button_Group.okBtn.size = [350, 40];
    Button_Group.cancelBtn = Button_Group.add("button", undefined, "Cancel", { name: "cancel" });
    Button_Group.cancelBtn.size = [100, 40];
    Button_Group.saveSettingsBtn = Button_Group.add("button", undefined, "Save Settings");
    Button_Group.saveSettingsBtn.size = [150, 40];
    Button_Group.loadSettingsBtn = Button_Group.add("button", undefined, "Load Settings");
    Button_Group.loadSettingsBtn.size = [150, 40];

    // --- PATCH: LOAD SETTINGS robusto ---
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
            // Salta righe senza due punti
            if (!line || line.indexOf(":") < 1) continue;
            var idx = line.indexOf(":");
            var key = line.substring(0, idx).replace(/\s/g, "");     // rimuove tutti gli spazi nella chiave
            var value = line.substring(idx + 1).replace(/^\s+/, ""); // rimuove solo spazi a sinistra nel valore
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
            myWin.layout.layout(true);
            myWin.update();
        } catch (e) {
            alert("Error updating UI: " + e);
        }
        alert("Settings loaded.");
    };

    // --- SAVE SETTINGS BUTTON: salva i parametri attuali della dialog
    Button_Group.saveSettingsBtn.onClick = function () {
        TSclass.p.inputFolder    = Input1Edit.text;
        TSclass.p.outputFolder   = OutputFolder.text;
        TSclass.p.outputFile     = OutputFile.text;
        TSclass.p.outputType     = OutputFileType.selection ? OutputFileType.selection.text.toLowerCase() : "jpg";
        TSclass.p.outputPattern  = OutputPattern.selection ? OutputPattern.selection.text : "Horizontal Slices Top To Bottom";
        TSclass.p.outputQuality  = 12; // Puoi aggiungere un campo se vuoi modificare la qualità da GUI
        TSclass.p.shadow         = shadowDropdown.selection ? shadowDropdown.selection.text.toLowerCase() : "no";
        TSclass.p.shadowColor    = colorInput.text;
        TSclass.p.shadowOpacity  = Math.round(opacitySlider.value);
        TSclass.p.shadowAngle    = Math.round(angleSlider.value);
        TSclass.p.shadowDist     = Math.round(distanceSlider.value);
        TSclass.p.shadowSize     = Math.round(blurSlider.value);
        TSclass.p.shadowSpread   = Math.round(spreadSlider.value);

        var folder = Folder("~/Documents/tsp/");
        if (!folder.exists) folder.create();
        var fileName = "TimeSlicerPro-settings_" + getNowTimestamp() + ".txt";
        var file = new File(folder.fsName + "/" + fileName);

        TSclass.saveSettingsToFile(TSclass.p, file);
    };

    Button_Group.cancelBtn.onClick = function () {
        myWin.close();
        TSclass.p.process = false;
    };

    Button_Group.okBtn.onClick = function () {
        function normalizePath(path) {
            if ($.os.toLowerCase().indexOf('windows') !== -1) {
                return path.replace(/\//g, "\\");
            }
            return path;
        }
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

        var ext = OutputFileType.selection.text.toLowerCase();
        var outFolder = OutputFolder.text;
        var outFileName = OutputFile.text;
        var ts = getNowTimestamp();
        outFileName = outFileName + "_" + ts;
        OutputFile.text = outFileName;
        var fullPath, outputFileObj;
        while (true) {
            fullPath = outFolder + "/" + outFileName + "." + ext;
            var checkPath = normalizePath(fullPath);
            outputFileObj = new File(checkPath);
            var exists = outputFileObj.exists || (new File(outputFileObj.fsName)).exists;
            if (!exists) break;
            var choice = confirm(
                "WARNING!\nOutput file already exists:\n\n" + fullPath +
                "\n\nDo you want to overwrite it?\n\nPress No to choose a new name.",
                true
            );
            if (choice) {
                break;
            } else {
                var now = new Date();
                var ts =
                    now.getFullYear().toString() + "-" + 
                    ("0" + (now.getMonth() + 1)).slice(-2) + "-" +
                    ("0" + now.getDate()).slice(-2) + "_" +
                    ("0" + now.getHours()).slice(-2) + "-" + 
                    ("0" + now.getMinutes()).slice(-2) + "-" +
                    ("0" + now.getSeconds()).slice(-2);
                var suggested = outFileName + "_" + ts;
                var newName = prompt(
                    "Choose a new output file name:", suggested
                );
                if (!newName) {
                    return false;
                }
                OutputFile.text = newName;
                outFileName = newName;
            }
        }
        TSclass.p.inputFolder = Input1Edit.text;
        TSclass.putOption("inputFolder_101", TSclass.p.inputFolder);
        TSclass.p.outputFolder = OutputFolder.text;
        TSclass.putOption("outputFolder_101", TSclass.p.outputFolder);
        TSclass.p.outputFile = OutputFile.text;
        TSclass.putOption("outputFile_101", TSclass.p.outputFile);
        TSclass.p.outputType = OutputFileType.selection.text.toLowerCase();
        TSclass.putOption("outputType_101", TSclass.p.outputType);
        TSclass.p.outputPattern = OutputPattern.selection.text;
        TSclass.putOption("outputPattern_101", TSclass.p.outputPattern);
        TSclass.p.shadow = shadowDropdown.selection.text.toLowerCase();
        TSclass.p.shadowColor = colorInput.text;
        TSclass.p.shadowOpacity = Math.round(opacitySlider.value);
        TSclass.p.shadowAngle = Math.round(angleSlider.value);
        TSclass.p.shadowDist = Math.round(distanceSlider.value);
        TSclass.p.shadowSize = Math.round(blurSlider.value);
        TSclass.p.shadowSpread = Math.round(spreadSlider.value);
        TSclass.p.process = true;
        myWin.close();
    };

    // CREDIT PANEL
    myWin.CreditPanel = myWin.add("panel", undefined, "TimeSlicerPro:");
    var CreditText = myWin.CreditPanel.add("group", undefined, "");
    var CreditTextLabel = CreditText.add("statictext", undefined, "CapZicco | Em@il: capzicco@gmail.com", { multiline: true });
    CreditTextLabel.graphics.font = "Verdana-bold:12";
    CreditTextLabel.size = [430, 20];

    myWin.show();
};

// =========================
// 4. METODI DI CLASSE AGGIUNTIVI
// =========================

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
    var idsetd = charIDToTypeID("setd");
    var desc360 = new ActionDescriptor();
    var idnull = charIDToTypeID("null");
    var ref131 = new ActionReference();
    var idChnl = charIDToTypeID("Chnl");
    var idfsel = charIDToTypeID("fsel");
    ref131.putProperty(idChnl, idfsel);
    desc360.putReference(idnull, ref131);
    var idT = charIDToTypeID("T   ");
    var desc361 = new ActionDescriptor();
    var idPts = charIDToTypeID("Pts ");
    var list17 = new ActionList();
    var desc362 = new ActionDescriptor();
    var idHrzn = charIDToTypeID("Hrzn");
    var idPxl = charIDToTypeID("#Pxl");
    desc362.putUnitDouble(idHrzn, idPxl, x1);
    var idVrtc = charIDToTypeID("Vrtc");
    desc362.putUnitDouble(idVrtc, idPxl, y1);
    var idPnt = charIDToTypeID("Pnt ");
    list17.putObject(idPnt, desc362);
    var desc363 = new ActionDescriptor();
    desc363.putUnitDouble(idHrzn, idPxl, x2);
    desc363.putUnitDouble(idVrtc, idPxl, y2);
    list17.putObject(idPnt, desc363);
    var desc364 = new ActionDescriptor();
    desc364.putUnitDouble(idHrzn, idPxl, x3);
    desc364.putUnitDouble(idVrtc, idPxl, y3);
    list17.putObject(idPnt, desc364);
    var desc365 = new ActionDescriptor();
    desc365.putUnitDouble(idHrzn, idPxl, x4);
    desc365.putUnitDouble(idVrtc, idPxl, y4);
    list17.putObject(idPnt, desc365);
    var desc366 = new ActionDescriptor();
    desc366.putUnitDouble(idHrzn, idPxl, x1);
    desc366.putUnitDouble(idVrtc, idPxl, y1);
    list17.putObject(idPnt, desc366);
    desc361.putList(idPts, list17);
    var idPlgn = charIDToTypeID("Plgn");
    desc360.putObject(idT, idPlgn, desc361);
    var idAntA = charIDToTypeID("AntA");
    desc360.putBoolean(idAntA, true);
    executeAction(idsetd, desc360, DialogModes.NO);
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
    var idsetd = charIDToTypeID("setd");
    var desc832 = new ActionDescriptor();
    var idnull = charIDToTypeID("null");
    var ref341 = new ActionReference();
    var idChnl = charIDToTypeID("Chnl");
    var idfsel = charIDToTypeID("fsel");
    ref341.putProperty(idChnl, idfsel);
    desc832.putReference(idnull, ref341);
    var idT = charIDToTypeID("T   ");
    var desc833 = new ActionDescriptor();
    var idTop = charIDToTypeID("Top ");
    desc833.putUnitDouble(idTop, charIDToTypeID("#Pxl"), y1);
    var idLeft = charIDToTypeID("Left");
    desc833.putUnitDouble(idLeft, charIDToTypeID("#Pxl"), x1);
    var idBtom = charIDToTypeID("Btom");
    desc833.putUnitDouble(idBtom, charIDToTypeID("#Pxl"), y2);
    var idRght = charIDToTypeID("Rght");
    desc833.putUnitDouble(idRght, charIDToTypeID("#Pxl"), x2);
    var idElps = charIDToTypeID("Elps");
    desc832.putObject(idT, idElps, desc833);
    var idAntA = charIDToTypeID("AntA");
    desc832.putBoolean(idAntA, true);
    executeAction(idsetd, desc832, DialogModes.NO);
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
    var idsetd = charIDToTypeID("setd");
    var desc30 = new ActionDescriptor();
    var idnull = charIDToTypeID("null");
    var ref12 = new ActionReference();
    var idPrpr = charIDToTypeID("Prpr");
    var idLefx = charIDToTypeID("Lefx");
    ref12.putProperty(idPrpr, idLefx);
    var idLyr = charIDToTypeID("Lyr ");
    var idOrdn = charIDToTypeID("Ordn");
    var idTrgt = charIDToTypeID("Trgt");
    ref12.putEnumerated(idLyr, idOrdn, idTrgt);
    desc30.putReference(idnull, ref12);

    var idT = charIDToTypeID("T   ");
    var desc31 = new ActionDescriptor();
    var idgagl = charIDToTypeID("gagl");
    var idAng = charIDToTypeID("#Ang");
    desc31.putUnitDouble(idgagl, idAng, angle);
    var idScl = charIDToTypeID("Scl ");
    var idPrc = charIDToTypeID("#Prc");
    desc31.putUnitDouble(idScl, idPrc, 100);
    var idDrSh = charIDToTypeID("DrSh");
    var desc32 = new ActionDescriptor();
    var idenab = charIDToTypeID("enab");
    desc32.putBoolean(idenab, true);
    var idMd = charIDToTypeID("Md  ");
    var idBlnM = charIDToTypeID("BlnM");
    var idMltp = charIDToTypeID("Mltp");
    desc32.putEnumerated(idMd, idBlnM, idMltp);
    var idClr = charIDToTypeID("Clr ");
    var desc33 = new ActionDescriptor();
    desc33.putDouble(charIDToTypeID("Rd  "), r);
    desc33.putDouble(charIDToTypeID("Grn "), g);
    desc33.putDouble(charIDToTypeID("Bl  "), b);
    var idRGBC = charIDToTypeID("RGBC");
    desc32.putObject(idClr, idRGBC, desc33);
    desc32.putUnitDouble(charIDToTypeID("Opct"), charIDToTypeID("#Prc"), opacity);
    desc32.putBoolean(charIDToTypeID("uglg"), true);
    desc32.putUnitDouble(charIDToTypeID("lagl"), charIDToTypeID("#Ang"), angle);
    desc32.putUnitDouble(charIDToTypeID("Dstn"), charIDToTypeID("#Pxl"), dist);
    desc32.putUnitDouble(charIDToTypeID("Ckmt"), charIDToTypeID("#Pxl"), spread);
    desc32.putUnitDouble(charIDToTypeID("blur"), charIDToTypeID("#Pxl"), size);
    desc32.putUnitDouble(charIDToTypeID("Nose"), charIDToTypeID("#Prc"), 0);
    desc32.putBoolean(charIDToTypeID("AntA"), false);
    var idTrnS = charIDToTypeID("TrnS");
    var desc34 = new ActionDescriptor();
    desc34.putString(charIDToTypeID("Nm  "), "Linear");
    var idShpC = charIDToTypeID("ShpC");
    desc32.putObject(idTrnS, idShpC, desc34);
    desc32.putBoolean(stringIDToTypeID("layerConceals"), true);
    desc31.putObject(idDrSh, idDrSh, desc32);
    desc30.putObject(idT, idLefx, desc31);
    executeAction(idsetd, desc30, DialogModes.NO);
};

TSclass.getOption = function (a) {
    try {
        var desc = app.getCustomOptions(a);
        return desc.getString(0);
    } catch (e) {
        return false;
    }
};
TSclass.putOption = function (a, b) {
    var desc2 = new ActionDescriptor();
    desc2.putString(0, b, true);
    app.putCustomOptions(a, desc2, true);
};
TSclass.myAlert = function (msg, title, isErr) {};
TSclass.writeTextFile = function (msg) {
    var currentdate = new Date();
    var datetime = currentdate.getDate() + "/" + (currentdate.getMonth() + 1) + "/" + currentdate.getFullYear() + "@" +
        currentdate.getHours() + ":" + currentdate.getMinutes() + ":" + currentdate.getSeconds();
    var txtFile = new File(TSclass.p.outputFolder + "/log.txt");
    txtFile.open("a");
    txtFile.writeln(tsVersion + "| " + datetime + ": " + msg);
    txtFile.close();
};
TSclass.saveSettingsToFile = function (settings, file) {
    var skipKeys = {
        isPro: true,
        importFileExtensions: true,
        w: true,
        h: true,
        process: true,
        dummyText: true
    };
    var settingsText = "";
    for (var k in settings) {
        if (!settings.hasOwnProperty(k)) continue;
        if (skipKeys[k]) continue;
        settingsText += k + ": " + settings[k] + "\n";
    }
    file.open("w");
    file.write(settingsText);
    file.close();
    alert("Settings salvati in:\n" + decodeURI(file.fsName));
    return true;
};
TSclass.vc = function () { return true; };

// =========================
// 5. ENTRYPOINT
// =========================
var db = false;
var myClass = new TSclass();
myClass.main();