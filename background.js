chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "save-text",
    title: "Save text to QuickPaste",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener(function (clickData) {
  if (clickData.menuItemId === "save-text") {
    let currentText = clickData.selectionText;

    let pageURL = clickData.pageUrl;

    let textArray = [];
    let lines = currentText.split(/\s{2,}/);
    for (let line of lines) {
      textArray.push(line.trim());
    }

    chrome.storage.local.get(["text"]).then((result) => {
      let allText = result.text || [];

      allText.push({
        text: textArray,
        url: pageURL,
      });

      chrome.storage.local.set({ text: allText }).then(() => {
        chrome.storage.sync.get(["notifOptions"], function (result) {
          if (result.notifOptions === "On") {
            chrome.notifications.create({
              type: "basic",
              iconUrl: "./icons/logo48x48.png",
              title: "QuickPaste:",
              message: "Your clip was saved",
              requireInteraction: false,
            });
          }
        });
      });
    });
  }
});
