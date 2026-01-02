//* Print the contents of the saved array in the popup.html
chrome.storage.local.get(["text"]).then((result) => {
  if (result.text) {
    //Only print if it has a value. To not print "undefined"
    //I thought an array would be the best option to store all the selected texts, because I can select an individual one later and delete it or any other action
    let textArray = result.text;

    //* Loop through the array to print out each element in a new paragraph
    for (let i = 0; i < textArray.length; i++) {
      //Create new paragraph element
      let newContainer = document.createElement("div");
      newContainer.id = i;
      newContainer.className = "paragraph-container";
      let letterCount = 0;
      //?################ PARAGRAPHS ###########################
      //*Create paragraphs to preserve the original paragraphs as much as possible
      currentElement = textArray[i];
      for (let j = 0; j < currentElement.length; j++) {
        letterCount += currentElement.length;
        // console.log(
        //   "Letter count of element " + currentElement + " is " + letterCount
        // );
        let newParagraph = document.createElement("p");
        if (letterCount < 50) {
          newParagraph.innerText = currentElement[j];
          newParagraph.className = "paragraph-text";
          newContainer.appendChild(newParagraph);
        } else {
          //* Link to view the whole selected page in collections
          let linkForMore = document.createElement("a");
          linkForMore.href = "./options.html#" + i; //redirects you to the full text clip
          linkForMore.target = "_blank";
          linkForMore.innerText = "View more...";
          newContainer.appendChild(linkForMore);
          newContainer.appendChild(document.createElement("br"));
          break;
        }
      }

      //Append it to the big div container
      document.querySelector("#paragraph-box").appendChild(newContainer);

      //?############# DELETE BUTTON ###########################
      //* Create a button with the id of the current i value
      let deleteButton = document.createElement("button");
      deleteButton.className = "button";
      deleteButton.id = i; //it gets the id of the iteration number for ease of access
      deleteButton.innerText = "Remove";

      //*Add an event listener to it
      deleteButton.addEventListener("click", function () {
        textArray.splice(i, 1);
        chrome.storage.local.set({ text: textArray });
        // location.reload();
        let elementToRemove = document.getElementById(i);
        elementToRemove.parentNode.removeChild(elementToRemove);
      });
      //Append it to the div
      newContainer.appendChild(deleteButton);

      //?############### URL BUTTON ###########################
      //* Add a button that views source URL where the selection was made from
      let sourceButton = document.createElement("button");
      sourceButton.className = "button";
      sourceButton.id = i; //it gets the id of the iteration number for ease of access
      sourceButton.innerText = "View URL";

      //* Add event listener to redirect to URL
      sourceButton.addEventListener("click", function () {
        chrome.storage.local.get({ URL: "" }, function (result) {
          let pageURL = result.URL;
          if (pageURL && pageURL.startsWith("http")) {
            window.open(pageURL, "_blank");
          }
        });
      });
      newContainer.appendChild(sourceButton);

      //*Add a horizontal line
      let horizontalLine = document.createElement("hr");
      horizontalLine.className = "horizontal-line";
      newContainer.appendChild(horizontalLine);
    }
  }
});
