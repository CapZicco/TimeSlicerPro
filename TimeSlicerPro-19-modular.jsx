/*
 * TimeSlicerPro v19.00
 * by CapZicco & Copilot
 * - Funzionalità Oval, Spiral e Grid Slices (Mosaic)
 * - UI con sezione Grid e slider ROWS/COLS visibili solo per Grid Slices
 * - Le celle vengono popolate ciclicamente dalle immagini
 */

(function() {
    // ===== SETTINGS =====
    var settingsPath = '~/Documents/tsp/TSP-LastSettingsUsed.txt';
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

    // ===== UTILS =====
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

    // ===== IMAGE SAVE/LAYER =====
    function saveImage(type, folder, fileName, quality, patternName) {
        var ext = type.toLowerCase();
        if (ext.charAt(0) !== ".") ext = "." + ext;
        var timestamp = getNowTimestamp();
        // patternName: solo la parte maiuscola per uniformità
        var patt = (patternName || "").replace(/[^A-Za-z]+/g,"_").replace(/^_+|_+$/g,"").toUpperCase();
        var fileNameWithTs = fileName + "_" + timestamp + (patt ? "_" + patt : "");
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

    // ===== MASKING & SELECTION =====
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

    // OVAL PATCH minimal
    function selectEclipse(i, j, fwd) {
        var idx = fwd ? i : (j - 1 - i);
        var doc = app.activeDocument;
        var w = parseInt(doc.width);
        var h = parseInt(doc.height);
        if (idx == 0) { selectRect(0, 0, w, h); return; }
        var x1 = 0 + (((idx / j) * w) / 2);
        var y1 = 0 + (((idx / j) * h) / 2);
        var x2 = w - (((idx / j) * w) / 2);
        var y2 = h - (((idx / j) * h) / 2);
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

    // SPIRAL PATCH minimal
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

    // GRID PATCH
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
            case "forward":
                if (settings.outputPattern && settings.outputPattern.indexOf("Horizontal") > -1) { 
                    angle = 90;
                } else {
                    angle = 180;
                }
                break;
            case "backward":
                if (settings.outputPattern && settings.outputPattern.indexOf("Horizontal") > -1) { 
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
    }

    // ===== LOG =====
    function writeLog(msg, outputFolder, enabled) {
        if (!enabled) return;
        var currentdate = new Date();
        var datetime = currentdate.getDate() + "/" + (currentdate.getMonth() + 1) + "/" + currentdate.getFullYear() + "@" +
            currentdate.getHours() + ":" + currentdate.getMinutes() + ":" + currentdate.getSeconds();
        var txtFile = new File(outputFolder + "/log.txt");
        txtFile.open("a");
        txtFile.writeln("v19 | " + datetime + ": " + msg);
        txtFile.close();
    }

     // ===== DIALOG (INTEGRATO) =====
    function showDialog(settings) {
        var prefs = settings;
        var myWin = new Window("dialog", "TimeSlicerPro v19.00");

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
            "Spiral Stripes",
            "Grid Slices (Mosaic)"
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
            gridPanel.visible = this.selection && this.selection.text == "Grid Slices (Mosaic)";
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
        var spiralTwistSlider = spiralPanel.add("slider", undefined, parseInt(prefs.stripeTwist) || 4, 0, 12);
        spiralTwistSlider.preferredSize.width = 120;
        var spiralTwistValue = spiralTwistGroup.add("statictext", undefined, (parseInt(prefs.stripeTwist) || 4).toString());
        spiralTwistSlider.onChanging = function () {
            spiralTwistValue.text = Math.round(spiralTwistSlider.value).toString();
        };

        spiralPanel.visible = OutputPattern.selection && OutputPattern.selection.text == "Spiral Stripes";

        // GRID PANEL
        var gridPanel = myWin.SettingsPanel.add("panel", undefined, "Grid Slices Options");
        gridPanel.orientation = "row";
        gridPanel.alignChildren = "left";

        var gridRowsGroup = gridPanel.add("group");
        gridRowsGroup.add("statictext", undefined, "Rows:");
        var gridRowsSlider = gridRowsGroup.add("slider", undefined, parseInt(prefs.gridRows) || 3, 1, 20);
        gridRowsSlider.preferredSize.width = 80;
        var gridRowsValue = gridRowsGroup.add("statictext", undefined, (parseInt(prefs.gridRows) || 3).toString());
        gridRowsSlider.onChanging = function () {
            gridRowsValue.text = Math.round(gridRowsSlider.value).toString();
        };

        var gridColsGroup = gridPanel.add("group");
        gridColsGroup.add("statictext", undefined, "Columns:");
        var gridColsSlider = gridColsGroup.add("slider", undefined, parseInt(prefs.gridCols) || 3, 1, 20);
        gridColsSlider.preferredSize.width = 80;
        var gridColsValue = gridColsGroup.add("statictext", undefined, (parseInt(prefs.gridCols) || 3).toString());
        gridColsSlider.onChanging = function () {
            gridColsValue.text = Math.round(gridColsSlider.value).toString();
        };
        gridPanel.visible = OutputPattern.selection && OutputPattern.selection.text == "Grid Slices (Mosaic)";

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
            settings.inputFolder    = Input1Edit.text;
            settings.outputFolder   = OutputFolder.text;
            settings.outputFile     = OutputFile.text;
            settings.outputType     = OutputFileType.selection ? OutputFileType.selection.text.toLowerCase() : "jpg";
            settings.outputPattern  = OutputPattern.selection ? OutputPattern.selection.text : "Horizontal Slices Top To Bottom";
            settings.outputQuality  = 12;
            settings.shadow         = shadowDropdown.selection ? shadowDropdown.selection.text.toLowerCase() : "no";
            settings.shadowColor    = colorInput.text;
            settings.shadowOpacity  = Math.round(opacitySlider.value);
            settings.shadowAngle    = Math.round(angleSlider.value);
            settings.shadowDist     = Math.round(distanceSlider.value);
            settings.shadowSize     = Math.round(blurSlider.value);
            settings.shadowSpread   = Math.round(spreadSlider.value);
            settings.radialOrder    = radialOrderDropdown.selection ? (radialOrderDropdown.selection.index === 1 ? "edge" : "center") : "center";
            settings.stripeTwist    = Math.round(spiralTwistSlider.value);
            settings.spiralStripesNum = Math.round(spiralNumSlider.value);
            settings.gridRows = Math.round(gridRowsSlider.value);
            settings.gridCols = Math.round(gridColsSlider.value);
            settings.generateLog    = logCheckbox.value ? true : false;

            var folder = Folder("~/Documents/tsp/");
            if (!folder.exists) folder.create();
            var fileName = "TimeSlicerPro-settings_" + getNowTimestamp() + ".txt";
            var file = new File(folder.fsName + "/" + fileName);

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
                if (opacitySlider && settings.shadowOpacity !== undefined) opacitySlider.value = Number(settings.shadowOpacity);
                if (angleSlider && settings.shadowAngle !== undefined) angleSlider.value = Number(settings.shadowAngle);
                if (distanceSlider && settings.shadowDist !== undefined) distanceSlider.value = Number(settings.shadowDist);
                if (blurSlider && settings.shadowSize !== undefined) blurSlider.value = Number(settings.shadowSize);
                if (spreadSlider && settings.shadowSpread !== undefined) spreadSlider.value = Number(settings.shadowSpread);
                if (opacityValue) opacityValue.text = Math.round(opacitySlider.value) + "%";
                if (angleValue) angleValue.text = Math.round(angleSlider.value) + "°";
                if (distanceValue) distanceValue.text = Math.round(distanceSlider.value) + " px";
                if (blurValue) blurValue.text = Math.round(blurSlider.value) + " px";
                if (spreadValue) spreadValue.text = Math.round(spreadSlider.value) + " px";
                spiralTwistSlider.value = Number(settings.stripeTwist) || 4;
                spiralTwistValue.text = Math.round(spiralTwistSlider.value).toString();
                spiralNumSlider.value = Number(settings.spiralStripesNum) || 12;
                spiralNumValue.text = Math.round(spiralNumSlider.value).toString();
                gridRowsSlider.value = Number(settings.gridRows) || 3;
                gridRowsValue.text = Math.round(gridRowsSlider.value).toString();
                gridColsSlider.value = Number(settings.gridCols) || 3;
                gridColsValue.text = Math.round(gridColsSlider.value).toString();
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
            settings.shadowOpacity = Math.round(opacitySlider.value);
            settings.shadowAngle = Math.round(angleSlider.value);
            settings.shadowDist = Math.round(distanceSlider.value);
            settings.shadowSize = Math.round(blurSlider.value);
            settings.shadowSpread = Math.round(spreadSlider.value);
            settings.radialOrder = radialOrderDropdown.selection ? (radialOrderDropdown.selection.index === 1 ? "edge" : "center") : "center";
            settings.generateLog = logCheckbox.value ? true : false;
            settings.stripeTwist = Math.round(spiralTwistSlider.value);
            settings.spiralStripesNum = Math.round(spiralNumSlider.value);
            settings.gridRows = Math.round(gridRowsSlider.value);
            settings.gridCols = Math.round(gridColsSlider.value);

            saveSettings(settings);

            settings.process = true;
            myWin.close();
        };

        // CREDITS
        myWin.CreditPanel = myWin.add("panel", undefined, "TimeSlicerPro:");
        var CreditText = myWin.CreditPanel.add("group", undefined, "");
        var CreditTextLabel = CreditText.add("statictext", undefined, "CapZicco | Email: capzicco@gmail.com", { multiline: true });
        CreditTextLabel.graphics.font = "Verdana-bold:12";
        CreditTextLabel.size = [430, 20];

        myWin.center();
        myWin.show();
    }

    // ===== MAIN =====
    function main() {
        var settings = loadSettings() || getDefaults();
        var repeat = true;
        while (repeat) {
            // PATCH 1: CHIUSURA DOCUMENTI APERTI PRIMA DI PARTIRE
            if (filesOpenCount()) {
                if (confirm("Ci sono immagini aperte in Photoshop.\nVuoi chiuderle tutte e iniziare?", true)) {
                    while (filesOpenCount()) closeFile(app.activeDocument, "nosave");
                } else {
                    alert("Operazione annullata dall'utente: chiudere le immagini aperte e riprovare.");
                    return;
                }
            }

            showDialog(settings);
            if (!settings.process) {
                // PATCH 2: CHIUSURA IMMAGINE ALL'USCITA DA CANCEL
                if (filesOpenCount()) {
                    if (confirm("L’ultima immagine generata è ancora aperta.\nVuoi chiuderla?", true)) {
                        while (filesOpenCount()) closeFile(app.activeDocument, "nosave");
                    }
                }
                break;
            }
            while (filesOpenCount()) {
                closeFile(app.activeDocument, "nosave");
            }
            var files = getMyFiles(settings.inputFolder, "/.(?:.jpg)$/i");
            var len = files.length;
            var newFile;
            var alreadyProcessedGrid = false;
            for (var i = 0; i < len; i++) {
                // --- GRID SLICES (MOSAIC) OVERRIDE ---
                if (!alreadyProcessedGrid && settings.outputPattern === "Grid Slices (Mosaic)") {
                    alreadyProcessedGrid = true;
                    var numRows = parseInt(settings.gridRows) || 3;
                    var numCols = parseInt(settings.gridCols) || 3;
                    var totalCells = numRows * numCols;
                    var w, h;
                    // Apri la prima immagine per base dimensioni
                    var baseFile = openFile(files[0].path + "/" + files[0].name);
                    if (!baseFile) continue;
                    newFile = baseFile.duplicate();
                    w = newFile.width.value || parseInt(newFile.width);
                    h = newFile.height.value || parseInt(newFile.height);
                    closeFile(baseFile, "nosave");

                    for (var cell = 0; cell < totalCells; cell++) {
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
                        var newLayerRef = app.activeDocument.artLayers.add();
                        switch (settings.shadow ? settings.shadow.toLowerCase() : "no") {
                            case "forward":
                                newLayerRef.move(newFile, ElementPlacement.PLACEATEND); break;
                            case "backward":
                                newLayerRef.move(newFile, ElementPlacement.PLACEATBEGINNING); break;
                        }
                        newFile.mergeVisibleLayers();
                    }
                    break; // esci dal ciclo for (tutto già fatto)
                }
                // --- FINE PATCH GRID ---

                var processingFile = openFile(files[i].path + "/" + files[i].name);
                if (!processingFile) continue;
                if (i == 0) {
                    newFile = processingFile.duplicate();
                    settings.w = newFile.width.value || parseInt(newFile.width);
                    settings.h = newFile.height.value || parseInt(newFile.height);
                } else {
                    if ((settings.w == processingFile.width) && (settings.h == processingFile.height)) {
                        duplicateLayersInto(newFile);
                    } else {
                        alert("Image " + processingFile.name + " is not the same size as the first, IGNORING");
                    }
                }
                closeFile(processingFile, "nosave");
                newFile.activeLayer.name = files[i].name.slice(0, -4);
                var radialOrder = settings.radialOrder || "center";
                switch (settings.outputPattern) {
                    case "Horizontal Slices Top To Bottom":
                        var x1 = 0;
                        var y1 = settings.h * (i / len);
                        var x2 = settings.w;
                        var y2 = settings.h * ((i + 1) / len);
                        selectRect(x1, y1, x2, y2);
                        break;
                    case "Horizontal Slices Bottom To Top":
                        var x1 = 0;
                        var y1 = settings.h * ((len - (i + 1)) / len);
                        var x2 = settings.w;
                        var y2 = settings.h * ((len - i) / len);
                        selectRect(x1, y1, x2, y2);
                        break;
                    case "Diagonal Slices Left To Right":
                        selectInclined(i, len);
                        break;
                    case "Diagonal Slices Right To Left":
                        selectInclined(len - (i + 1), len);
                        break;
                    case "Oval-Circular Slices Outside-In":
                        selectEclipse(i, len, true);
                        newFile.activeLayer.name = files[i].name.slice(0, -4);
                        newFile.activeLayer.move(newFile, ElementPlacement.PLACEATBEGINNING);
                        break;
                    case "Oval-Circular Slices Inside-Out":
                        selectEclipse(i, len, false);
                        newFile.activeLayer.name = files[i].name.slice(0, -4);
                        newFile.activeLayer.move(newFile, ElementPlacement.PLACEATEND);
                        break;
                    case "Vertical Slices Left To Right":
                        var x1 = settings.w * (i / len);
                        var y1 = 0;
                        var x2 = settings.w * ((i + 1) / len);
                        var y2 = settings.h;
                        selectRect(x1, y1, x2, y2);
                        break;
                    case "Vertical Slices Right To Left":
                        var x1 = settings.w * ((len - (i + 1)) / len);
                        var y1 = 0;
                        var x2 = settings.w * ((len - i) / len);
                        var y2 = settings.h;
                        selectRect(x1, y1, x2, y2);
                        break;
                    case "Radial Slices (Pie)":
                    case "Radial Slices":
                        var idx = (radialOrder === "edge") ? (len - 1 - i) : i;
                        selectRadial(idx, len);
                        break;
                    case "Spiral Stripes":
                       var twist = parseInt(settings.stripeTwist);
if (isNaN(twist) || twist <= 0) twist = 4;

selectSpiralStripe(i, len, twist, settings.w, settings.h);

                        newFile.activeLayer.name = files[i].name.slice(0, -4);
                        newFile.activeLayer.move(newFile, ElementPlacement.PLACEATEND);
                        break;
                    // Grid gestito sopra!
                    default:
                        alert("Unknown pattern: " + settings.outputPattern);
                }
                maskSelection();
                addShadow(settings);
                var newLayerRef = app.activeDocument.artLayers.add();
                switch (settings.shadow ? settings.shadow.toLowerCase() : "no") {
                    case "forward":
                        newLayerRef.move(newFile, ElementPlacement.PLACEATEND); break;
                    case "backward":
                        newLayerRef.move(newFile, ElementPlacement.PLACEATBEGINNING); break;
                }
                newFile.mergeVisibleLayers();
            }
            var savedPath = saveImage(
                settings.outputType || "jpg",
                settings.outputFolder,
                settings.outputFile,
                settings.outputQuality || 12,
                settings.outputPattern // pattern nel nome file!
            );
            writeLog("Saved >>>" + savedPath, settings.outputFolder, settings.generateLog);
            alert("Done!\nCheck your work\n\n\n" + savedPath, "www.flickr.com/photos/luca-aka-zicco/", false);
            if (confirm("Do you want to generate another slicing?", true)) {
                repeat = true;
            } else {
                // PATCH 2: CHIUSURA IMMAGINE ALL'USCITA DOPO FINE NORMALE
                if (filesOpenCount()) {
                    if (confirm("L’ultima immagine generata è ancora aperta.\nVuoi chiuderla?", true)) {
                        while (filesOpenCount()) closeFile(app.activeDocument, "nosave");
                    }
                }
                repeat = false;
            }
        }
    }
    // ===== AVVIO =====
    main();

})();