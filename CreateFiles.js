// REWRITE THIS VARIABLE
var annttrToSourceFiles = {
  11: ["sheet_1.json", "sheet_2.json"],
};
// REWRITE THIS VARIABLE
var projectFolderId = "1bZFratZj-z1Fs9sRh905cULk5u6QIZV3";
var dataFolderName = "json_files";
var outFolderName = "gs_files"; // Running this code will delete existing files in this folder

function createSheets() {
  var projectFolder = DriveApp.getFolderById(projectFolderId);
  var outFolder = findChildFolderByName(projectFolder, outFolderName);
  cleanFolder(outFolder);

  for (var annttr in annttrToSourceFiles) {
    // Set up a spreadsheet and sheets
    var ss = createSpreadsheet(outFolder);
    ss.rename(annttr);
    Logger.log(`Created spreadsheet:`);
    Logger.log(ss.getUrl());

    var facesheet = ss.getSheetByName("Sheet1");
    facesheet.setName("facesheet");
    facesheet.setColumnWidth(1, 440);
    // We can use the following codes to put questions to annotators
    // facesheet.getRange(1, 1).setValue('Field 1');
    // facesheet.getRange(2, 1).setValue('Field 2');

    annttrToSourceFiles[annttr].forEach((sourceFile) => {
      var sheetName = sourceFile.split(".")[0];
      var sheet = ss.insertSheet();
      sheet.setName(sheetName);
      sheet.setColumnWidth(1, 140);
      // Increase rows to avoid bugs
      sheet.insertRowsAfter(1000, 5000);
    });
  }
}
