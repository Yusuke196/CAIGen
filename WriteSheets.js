// This code is designed to be run for each annotator, to make it easy to restart the process when an error occurs
// REWRITE THIS VARIABLE
var annttr = "11";
var debug = false;

function writeSheets() {
  // Initialize the state
  var scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty("nextSentIndex", 0);
  deleteAllTriggers();

  // Filling many cells takes time while the script has a time limit of 6 minutes, so measures against TimeOutError are necessary
  // In this recursive function, we:
  // - build a list of sentences to be written, i.e., sentList
  // - write sentences one by one, updating sentIndex
  // - if the time limit is reached, save the state and set a trigger for the next iteration
  processNextItem();
}

function processNextItem() {
  // The definitions of `projectFolderId`, `dataFolderName`, and `outFolderName` are in CreateFiles.gs
  var projectFolder = DriveApp.getFolderById(projectFolderId);
  var dataFolder = findChildFolderByName(projectFolder, dataFolderName);
  var outFolder = findChildFolderByName(projectFolder, outFolderName);
  var ssFile = findFileByName(outFolder, annttr);
  var ss = SpreadsheetApp.openById(ssFile.getId());

  // Each sentence in sentList is represented as an object with the keys: dataName, sentData
  // dataName is the name of the data file (without the extension), e.g., 'sheet_1'
  // sentData has the keys: id, text, tokens
  var sentList = buildSentenceList(annttrToSourceFiles[annttr], dataFolder);
  if (debug) {
    sentList = sentList.slice(0, 2);
  }

  var scriptProperties = PropertiesService.getScriptProperties();
  var startIndex = parseInt(scriptProperties.getProperty("nextSentIndex"));
  // By setting maxTime at 4.75 min, we will have 1.25 minute for setting a trigger
  // This sort of margin is important to avoid TimeOutError
  var maxTime = 4.75 * 60 * 1000;
  var startTime = new Date().getTime();

  // Iteratively write sentences till the time limit is reached
  for (var i = startIndex; i < sentList.length; i++) {
    var append = true;
    writeSheet(ss, sentList[i].dataName, sentList[i].sentData, append);

    if (new Date().getTime() - startTime > maxTime) {
      // Save the state and setup a trigger for the next execution
      scriptProperties.setProperty("nextSentIndex", i + 1);
      ScriptApp.newTrigger("processNextItem")
        .timeBased()
        .after(1 * 1000)
        .create();
      return;
    }
  }

  // Report the completion
  var facesheet = ss.getSheetByName("facesheet");
  if (facesheet) {
    var row = Math.max(facesheet.getLastRow() + 1, 101);
    facesheet
      .getRange(row, 1)
      .setValue(`Completed writing ${sentList.length} sentences`);
  }
}

function buildSentenceList(inFiles, dataFolder) {
  var sentences = [];
  inFiles.forEach((inFile) => {
    var dataFile = findFileByName(dataFolder, inFile);
    var dataName = dataFile.getName().split(".")[0];
    var content = dataFile.getBlob().getDataAsString();
    var data = JSON.parse(content);
    data.forEach((obj) => {
      sentences.push({ dataName: dataName, sentData: obj });
    });
  });

  return sentences;
}

function writeSheet(ss, dataName, sentData, append = false) {
  // When append is true, open an existing sheet and start writing rows at the bottom. Otherwise, create a new sheet

  var colWordStart = 2;
  var wordPerLine = 10;
  var maxMwePerSent = 9;
  var bandWidth = maxMwePerSent + 3;

  if (!append) {
    var sheet = ss.insertSheet();
    sheet.setName(dataName);
    sheet.setColumnWidth(1, 140);
    // Insert rows, which is necessary to avoid bugs
    sheet.insertRowsAfter(1000, 4000);
    var row_i = 1;
    // Logger.log(`Writing ${dataName} from row ${row_i}`);
  } else {
    var sheet = ss.getSheetByName(dataName);
    if (sheet.getLastRow() === 0) {
      var row_i = 1;
    } else {
      var row_i = sheet.getLastRow() + 2;
    }
    if ((row_i - 1) % bandWidth != 0) {
      throw new Error(`row_i ${row_i} is invalid`);
    }
    // Logger.log(`Writing ${dataName} from row ${row_i}`);
  }

  // ==========

  // Log
  var facesheet = ss.getSheetByName("facesheet");
  if (facesheet) {
    var row = Math.max(facesheet.getLastRow() + 1, 101);
    facesheet
      .getRange(row, 1)
      .setValue(`Writing ${sentData.id} on ${dataName} row ${row_i}`);
  }

  // Write sentence ID
  sheet.getRange(row_i, 1).setValue(sentData.id);
  // Color the header row
  sheet.getRange(row_i, 1, 1, wordPerLine + 1).setBackground("#eee");

  row_i += 1;
  var col_i = colWordStart;

  // Write the MWE and Indices column
  // Header
  sheet.getRange(row_i, 1).setValue("Span");
  sheet.getRange(row_i, 2).setValue("Indices");
  var words = sentData.tokens.map((token) => token.surface);
  // This sentence is divided into `numRowsForThisSent` rows
  var numRowsForThisSent = Math.ceil(words.length / wordPerLine);
  // Initialize
  var rangesForWords = [];
  var rangesForIndices = [];
  var rangesForCboxes = {}; // This will be mapping from cbox_i (integer from 1 to 8) to ranges (array)
  for (var i = 1; i <= maxMwePerSent; i++) {
    rangesForCboxes[i] = [];
  }
  // Prepare ranges
  for (var i = 0; i < numRowsForThisSent; i++) {
    // Words
    var range = sheet
      .getRange(row_i + (i + 1) * bandWidth, col_i, 1, wordPerLine)
      .getA1Notation();
    rangesForWords.push(range);
    // Indices
    var rangeIndices = sheet
      .getRange(row_i - 1 + (i + 1) * bandWidth, col_i, 1, wordPerLine)
      .getA1Notation();
    rangesForIndices.push(rangeIndices);
    // Checkboxes
    for (var cbox_i = 1; cbox_i <= maxMwePerSent; cbox_i++) {
      var rangeCbox = sheet
        .getRange(row_i + (i + 1) * bandWidth + cbox_i, col_i, 1, wordPerLine)
        .getA1Notation();
      rangesForCboxes[cbox_i].push(rangeCbox);
    }
  }
  // Fill in cells in the MWE and Indices column one by one
  function getFormula(ranges, cbox_i) {
    var subFormulas = [];
    for (var i = 0; i < numRowsForThisSent; i++) {
      var subFormula = `TRIM(JOIN(" ", ARRAYFORMULA(IF(${rangesForCboxes[cbox_i][i]}, ${ranges[i]}, ""))))`;
      subFormulas.push(subFormula);
    }
    var formula = "TRIM(" + subFormulas.join('&" "&') + ")";
    return formula;
  }
  for (var cbox_i = 1; cbox_i <= maxMwePerSent; cbox_i++) {
    // Formula for MWE
    var formulaMwe = getFormula(rangesForWords, cbox_i);
    sheet.getRange(row_i + cbox_i, 1).setFormula(formulaMwe);
    // Formula for Indices
    var formulaIndices = getFormula(rangesForIndices, cbox_i);
    sheet.getRange(row_i + cbox_i, 2).setFormula(formulaIndices);
  }

  // Write the NE column
  // sheet.getRange(row_i, 2).setValue('Named entity');
  // sheet.getRange(row_i + 1, 2, maxMwePerSent).insertCheckboxes();

  // Write the "Unfixed word indices" column
  // sheet.getRange(row_i, 3).setValue('Unfixed word indices (space-separated)');

  // Write a border encompassing the range to be filled in by annotators
  sheet
    .getRange(row_i + 1, 1, maxMwePerSent, 2)
    .setBorder(true, true, true, true, false, false);

  // Write the "Sentence" column (only one row)
  sheet.getRange(row_i, 3).setValue("Sentence");
  sheet.getRange(row_i + 1, 3).setValue(sentData.text);

  row_i += bandWidth - 1;
  col_i = colWordStart;

  // ==========
  // Codes below are for the second band and below

  // Write the Span column
  function writeMweColumn(row_i) {
    sheet.getRange(row_i + 1, 1).setValue("Span");
    for (var i = 1; i <= maxMwePerSent; i++) {
      var formulaMwe = getFormula(rangesForWords, i);
      sheet.getRange(row_i + i + 1, 1).setFormula(formulaMwe);
    }
  }
  writeMweColumn(row_i);

  // Write words, etc.
  // TODO Minimize the times to execute setValue() and insertCheckboxes() for speedup
  for (var word_i = 0; word_i < words.length; word_i++) {
    // Write indices
    sheet.getRange(row_i, col_i).setValue(word_i + 1);
    // Cope with the situation where the value is not treated as a normal string
    if (words[word_i].startsWith("'") || words[word_i].includes("/")) {
      sheet.getRange(row_i + 1, col_i).setFormula(`="${words[word_i]}"`);
    } else {
      // In most cases this happens
      sheet.getRange(row_i + 1, col_i).setValue(words[word_i]);
    }
    // Write checkboxes (maxMwePerSent is for numRows)
    sheet.getRange(row_i + 2, col_i, maxMwePerSent).insertCheckboxes();

    col_i += 1;

    // At the end of a band
    if (col_i === colWordStart + wordPerLine && word_i != words.length - 1) {
      col_i = colWordStart;
      row_i += bandWidth;
      writeMweColumn(row_i);
    }
  }

  row_i += bandWidth;
}
