function createSpreadsheet(folder) {
  // Create a new spreadsheet in the root directory
  var spreadsheet = SpreadsheetApp.create("New Spreadsheet");
  // Get the file representation of the spreadsheet
  var file = DriveApp.getFileById(spreadsheet.getId());

  // Move the file to the specified folder
  // folder.createFile(file);
  file.moveTo(folder);
  return spreadsheet;
}

function cleanFolder(folder) {
  // Get an iterator for all files in the folder
  var files = folder.getFiles();

  // Loop through each file and delete
  while (files.hasNext()) {
    var file = files.next();
    file.setTrashed(true); // Move file to trash
  }
}

function findChildFolderByName(projectFolder, targetFolderName) {
  // Get all subfolders in the parent folder
  var subFolders = projectFolder.getFolders();
  // Iterate through subfolders to find the target folder
  while (subFolders.hasNext()) {
    var folder = subFolders.next();
    if (folder.getName() === targetFolderName) {
      return folder;
    }
  }

  throw new Error(
    `${targetFolderName} not found in ${projectFolder.getName()}`
  );
}

function findFileByName(folder, targetFileName) {
  var files = folder.getFiles();

  while (files.hasNext()) {
    var file = files.next();
    if (file.getName() == targetFileName) {
      return file;
    }
  }

  throw new Error(`${targetFileName} not found in ${folder.getName()}`);
}

function deleteAllTriggers() {
  // Get all triggers in the current project
  var triggers = ScriptApp.getProjectTriggers();

  // Loop through and delete each trigger
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
}
