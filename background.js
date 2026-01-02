//* Create context menu element
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "save-text",
    title: "Save text to QuickPaste",
    contexts: ["selection"],
  });
});

//* Listen to events when clicked on the menu element
chrome.contextMenus.onClicked.addListener(function (clickData) {
  // Check if what was clicked from the context menu was the "save-text" item
  if (clickData.menuItemId === "save-text") {
    let currentText = clickData.selectionText;

    //* Save page URL to the storage
    let pageURL = clickData.pageUrl;
    chrome.storage.local.set({ URL: pageURL }).then(() => {
      // console.log("Page URL is saved in storage: " + pageURL);
    });

    let allText = []; //here we store the existing text to add to it later
    let textArray = []; //store each line of the selected text in an array to try and preserve paragraph formating
    let lines = currentText.split(/\s{2,}/); //If an extra space is found, that means that this is the end of a paragraph
    for (let line of lines) {
      textArray.push(line.trim());
    }

    //* Update clip collection
    //First get the value of the existing texts stored
    chrome.storage.local.get(["text"]).then((result) => {
      allText = result.text || [];
      //Second, add the currentText to the existing text
      allText.push(textArray);
      chrome.storage.local.set({ text: allText }).then(() => {
        //# Notification when saved IF turned on from settings
        chrome.storage.sync.get(["notifOptions"], function (result) {
          if (result.notifOptions === "On") {
            console.log("I am notifying...");
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
