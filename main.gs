function main() {

  // ===========================================================================
  // 設定ここから
  // ==========================================================================

  // ここに監視対象のスプレッドシートのファイルIDを設定してください。
  // https://docs.google.com/spreadsheets/d/<スプレッドシートのファイルID>/edit
  const monitoringSheetId = "<here is Monitoring sheet spreadsheet file ID>";

  
  // ここに監視間隔を設定してください。
  // トリガーで設定した分数を設定することを推奨します。
  // 1分とかにすると変更が頻繁に行われるファイルだと通知がうるさいのでご調整ください
  const monitoringIntervalMinute = 5;

  // ここにSlackの通知用WebhookURLを設定してください。
  // https://hooks.slack.com/services/T0000000000/B0000000000/AAAABBBBCCCCDDDDEEEEFFFF
  const slackWebhookURL = "<here is webhook URL>"

  // ここにSlackの通知用チャンネル名を設定してください。
  // #google-docs-updates
  const slackChannel = "<here is slack channel name>"

  // ===========================================================================
  // 設定ここまで
  // ===========================================================================


  files = getUpdatedFilesFromMonitoringsheet(monitoringSheetId, monitoringIntervalMinute);

  for (let file of files) {
    var modifier = Drive.Files.get(file.getId()).lastModifyingUserName
    var name = file.getName();
    var url = file.getUrl();
    var slackText = modifier + "さんが" + name + " を更新しました。\n" + url;
    sendSlack(slackWebhookURL, slackChannel, slackText);
  }
}


function getUpdatedFilesFromMonitoringsheet(sheetId, interval) {
  const targetSheetName = "checklist";
  const sheet = SpreadsheetApp.openById(sheetId).getSheetByName(targetSheetName)
  if (sheet == null) {
    Logger.log('Cannot open the monitoring spreadsheet by fileId:' + sheetId);
    throw new Error('Cannot open the monitoring spreadsheet by fileId:' + sheetId);
  }

  files = [];
  
  // Google Drive FileID format
  // see https://stackoverflow.com/questions/47151920/what-is-format-of-google-drives-fileid-i-need-to-find-out-whether-new-file-ha
  const regex = '1[a-zA-Z0-9_-]{42}[AEIMQUYcgkosw048]';
  var textFinder = sheet.createTextFinder(regex).useRegularExpression(true);
  var ranges = textFinder.findAll();

  for (let range of ranges) {
    const cell = range.getCell(1, 1);
    const cellText = cell.getValue();
    const fileId = cellText.match(regex);

    const file = DriveApp.getFileById(fileId);
    if (file == null) {
      Logger.log('Cannot open the file by fileID:' + fileId);
      throw new Error('Cannot open the file by fileID:' + fileId);
    }

    if (isUpdatedFile(file, interval)) {
      files.push(file);
    }
  }

  return files;
}

function isUpdatedFile(file, monitoringIntervalMinute) {
  const lastUpdatedTime = file.getLastUpdated().getTime();
  const nowTime = new Date().getTime()

  if (nowTime - lastUpdatedTime <= monitoringIntervalMinute /*min*/ * 60 /*sec*/ * 1000 /*ms*/) {
    return true
  }
  return false
}

function sendSlack(webhookUrl, channel, slackText){
  var jsonData =
      {
        "channel": channel,
        "text" : slackText,
        "link_names" : 1,
        "username" : "GoogleDocsNotifier"
      };
  var payload = JSON.stringify(jsonData);
  var options =
      {
        "method" : "post",
        "contentType" : "application/json",
        "payload" : payload,
      };
  UrlFetchApp.fetch(webhookUrl, options);
}
