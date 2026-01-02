//* Function to save options to chrome.storage
function save_options() {
  //* Get the NOTIFICATION status: ON or OFF
  let notifOptionElements = document.getElementsByName("notifOption");

  for (let i = 0; i < notifOptionElements.length; i++) {
    let element = notifOptionElements[i];
    if (element.checked) {
      notificationsPreference = element.value;
      break;
    }
  }
  //* Update status to let user know options were saved.
  let status = document.getElementById("status");
  status.textContent = "Options saved.";
  setTimeout(function () {
    status.textContent = "";
  }, 1750);
}

document.getElementById("save").addEventListener("click", save_options);

//* Get the current status of the checked radios to initialize the page
let notifOptions;
chrome.storage.sync.get({ notifOptions: null }, function (result) {
  notifOptions = result.notifOptions;
  if (notifOptions) {
    if (notifOptions === "On") {
      document.getElementById("notifOn").checked = true;
    } else if (notifOptions === "Off") {
      document.getElementById("notifOff").checked = true;
    }
  } else {
    document.getElementById("notifOn").checked = true;
  }
});

// * Generate the COLLECTION

chrome.storage.local.get(["text"]).then((result) => {
  if (result.text) {
    if (result.text.length > 0) {
      let deleteSelected = document.getElementById("deleteSelected");
      deleteSelected.style.display = "block";
      let selectAllButton = document.getElementById("selectAll");
      selectAllButton.style.display = "block";
    }
    let textArray = result.text;
    for (let i = 0; i < textArray.length; i++) {
      //*Create new paragraph element
      let newContainer = document.createElement("div");
      newContainer.id = i;
      newContainer.className = "paragraph-container";
      // Horizontal line
      newContainer.appendChild(document.createElement("hr"));

      //***********CHECKBOX***********************************
      let newCheckbox = document.createElement("input");
      newCheckbox.type = "checkbox";
      newCheckbox.id = "checkbox #" + i;
      newCheckbox.name = "checkbox";
      newCheckbox.checked = false;
      // Label
      let newLabel = document.createElement("label");
      newLabel.htmlFor = newCheckbox.id;
      newLabel.innerHTML = "Select";

      newCheckbox.addEventListener("click", function () {
        chrome.storage.local.get({ selectedCheckboxes: [] }, function (result) {
          let selectedCheckboxes = result.selectedCheckboxes;
          if (newCheckbox.checked) {
            selectedCheckboxes.push(i);
          } else {
            let index = selectedCheckboxes.indexOf(i);
            if (index > -1) {
              selectedCheckboxes.splice(index, 1);
            }
          }
          //   Save checked boxes to storage
          chrome.storage.local.set(
            { selectedCheckboxes: selectedCheckboxes },
            function () {
              // console.log("Selected Checkboxes saved to storage: " + selectedCheckboxes);
            }
          );
        });
      });
      newContainer.appendChild(newCheckbox);
      newContainer.appendChild(newLabel);

      //*################ PARAGRAPHS ###########################
      //Create paragraphs to preserve the original paragraphs as much as possible
      currentElement = textArray[i];
      for (let j = 0; j < currentElement.length; j++) {
        let newParagraph = document.createElement("p");
        newParagraph.innerText = currentElement[j];
        newParagraph.className = "paragraph-text";
        newContainer.appendChild(newParagraph);
      }

      //Append it to the big div container
      document.querySelector("#collection-container").appendChild(newContainer);
    }
  }

  // ***********DELETE SELECTED BUTTON FUNCTIONALITY********
  let deleteButton = document.getElementById("deleteSelected");
  deleteButton.addEventListener("click", function () {
    chrome.storage.local.get(["text", "selectedCheckboxes"], function (result) {
      let textArray = result.text;
      let selectedCheckboxes = result.selectedCheckboxes;
      for (let i = selectedCheckboxes.length - 1; i >= 0; i--) {
        let index = selectedCheckboxes[i];
        textArray.splice(index, 1);
        selectedCheckboxes.splice(i, 1);
        chrome.storage.local.set(
          { text: textArray, selectedCheckboxes: selectedCheckboxes },
          function () {}
        );
        let elementToRemove = document.getElementById(index);
        elementToRemove.parentNode.removeChild(elementToRemove);
        location.reload();
      }
      if (textArray.length === 0) {
        let deleteSelected = document.getElementById("deleteSelected");
        deleteSelected.style.display = "none";
        location.reload();
      }
    });
  });

  // ***********SELECT ALL BUTTON FUNCTIONALITY********
  let selectAllButton = document.getElementById("selectAll");
  selectAllButton.addEventListener("click", function () {
    if (selectAllButton.innerText === "Select All") {
      selectAllButton.innerText = "Deselect All"; // Change text of button
      chrome.storage.local.get(["text"], function (result) {
        let textArray = result.text;
        let selectedCheckboxes = [];
        for (i = 0; i < textArray.length; i++) {
          selectedCheckboxes.push(i);
          let currentCheckBox = document.getElementById("checkbox #" + i);
          currentCheckBox.checked = true;
        }
        chrome.storage.local.set(
          { selectedCheckboxes: selectedCheckboxes },
          function () {}
        );
      });
    } else {
      selectAllButton.innerText = "Select All";
      chrome.storage.local.get(["text"], function (result) {
        let textArray = result.text;
        let selectedCheckboxes = [];
        for (i = 0; i < textArray.length; i++) {
          let currentCheckBox = document.getElementById("checkbox #" + i);
          currentCheckBox.checked = false;
        }
        chrome.storage.local.set(
          { selectedCheckboxes: selectedCheckboxes },
          function () {}
        );
      });
    }
  });
});

// ***********BACK TO TOP BUTTON**************************
let bttButton = document.getElementById("bttButton");
bttButton.addEventListener("click", function () {
  window.scrollTo(0, 0);
});
