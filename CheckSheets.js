var trgFolderName = "gs_files";
var correctNumOfSent = 100;

function checkNumberOfSentences() {
  var projectFolder = DriveApp.getFolderById(projectFolderId);
  var outFolder = findChildFolderByName(projectFolder, trgFolderName);

  for (var annttr in annttrToSourceFiles) {
    var ssFile = findFileByName(outFolder, annttr);
    var ss = SpreadsheetApp.openById(ssFile.getId());

    annttrToSourceFiles[annttr].forEach((sourceFile) => {
      var sheetName = sourceFile.split(".")[0];
      var sheet = ss.getSheetByName(sheetName);
      var sentCount = 0;
      var values = sheet.getRange(1, 3, sheet.getLastRow(), 1).getValues();
      values.forEach((value) => {
        if (value[0] === "Sentence") {
          sentCount++;
        }
      });
      if (sentCount === correctNumOfSent) {
        var sign = "✅";
      } else {
        var sign = "❌";
      }
      Logger.log(`${sheetName} has ${sentCount} sentences ${sign}`);
    });
  }
}
