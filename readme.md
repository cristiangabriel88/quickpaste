# QuickPaste

#### by Constantinescu Cristian-Gabriel

#### https://cristiangabriel.dev

#### Video Demo: https://youtu.be/tDfbTet89mI

<br>

#### Description: QuickPaste is a free and lightweight Chrome extension that simplifies your copy-pasting experience by providing a quick and easy way to save and access frequently used snippets of text. Once installed, QuickPaste adds a context menu option to Chrome that allows you to save selected text to your QuickPaste library. You can then quickly access your saved snippets at any time by clicking the QuickPaste icon in your browser's toolbar or by pressing CTRL+Q or Command+Q. You can also go into your QuickPaste Collections page and see all of your snippets, and choose what you want to keep and what you want to delete.

<br>

#### I decided on this project because I took Javascript courses in the past and am comfortable with it, and also HTML and CSS. But I never made a chrome extension before, so I knew it would be a challenge.

<br>

#### When I read on the final project page: "All that we ask is that you build something of interest to you, that you solve an actual problem, that you impact your community, or that you change the world." I decided to ask my friends for Chrome Extension ideeas that they would need, something that they would actually use. Two of them instantly replied with the same thing: "something fast and easy, to select some text and save it, like taking notes as you go, but no loging in, no account, really simple and fast." And I did exactly that, a fast and simple text saving tool that I now use myself and also my friends. I got so motivated that I made a website for it and enroled as a chrome developer and published it in the chrome store!

<br>

#### For storage I used the local memory (chrome.storage.local) to store the saved clips, and the sync memory (chrome.storage.sync) to store setting prefferences.

<br>

# Features

#### - Hotkey "CTRL+Q" or "Command+Q"

#### - Notifications On/OFF option

#### - Button for redirection to the URL of text source

#### - Preserves selected paragraphs where possible

#### - If paragraph is too long, shows "View More..." in popup and redirects to collections when clicked

#### - "Select All"/"Deselect All" Button

#### - "Delete Selected" Button

#### - Delete individual entry from popup

<br>

## **_File contents:_**

<br>

# background.js

#### contains the code to create the context menu item, get the selected text and save it in an array.

#### _Here is where I got in a bit of a jam. I found that when you select two lines of text and CTRL+C and then CTRL+V in a new file, the two lines are preserved. Here, using the selected text and the contextmenu, they are not preserved. Using the clipboard would have required extra permissions and after a whole day of documenting on the subject, I found it to be very very difficult in a Chrome extension, because of privacy issues. So I went with this solution: I found that sometimes when you extend your text selection past a paragraph that has a line separating it from the next paragraph, an extra white space is inserted at the end of the paragraph. So I used this to determine that that would be the end of a paragraph, and save it as a new element in an array. So the selected text is an array of paragraphs in an array of saved text-clips. This is the solution I found to work as close to the systems built-in clipboard._

#### The URL of the website is also saved in storage for further use in the popup.js file

#### After that, the array containing the selected text is saved at the end of the existing array containing the other saved texts, and the user is notified with a chrome notification, if the notifications are ON.

<br>

# manifest.json

#### contains the manifest file for the extension. I made it with the help of the chrome documentation for manifest v3. I asked for storage, contextMenus and notification permissions, I set the icons, added a keyboard shortcut "Ctrl+Q" or "Command+Q", added the service worker, which in this case is the file from before, background.js, the options page and the default icon for the popup.

<br>

# options.css

#### contains CSS for the options.html page. **_ I decided to have a separate css file for each html file, because it was getting too much at one point, with different button sizes, font sizes and such_**

#### I used Bootstrap for all the pages, and then added some details, like font from google fonts, and some spacing, margins, and colors. I also added button CSS that I found online for pretty buttons, which I then modified to my liking. Also modified the scroll bar.

<br>

# options.js

#### Contains the code for the options page for the extension.

#### The first thing is a function to get the selected notification prefference and inform the user that the settings were saved when the Save button is clicked.

#### Then added an eventlistener to call this function when the save button is clicked. After that, the page needs to be initialized with the current saved setting of the notification prefference, and check the respective option radio button. Next step is to generate the collection of saved texts. The Delete Selected and the Select all buttons are by default hidden, and if there are elements in the array, meaning that there are saved texts, the buttons display is changed to "block".

#### Then each text clip is printed in a div, and gets an id from a for loop so as to refer to it later when the user wants to delete a specific text clip. The div also contains a checkbox with the same id. An event listener is added to listen when a checkbox is clicked, and when it is, the ID of the checkbox is added to an array of selected checkboxes. If the i value exists in the selectedCheckboxes array, it is removed from the array using the splice() method. After this, go through each text clip element with another "for" loop to print out each element as a new paragraph.

#### After this, I implemented the functionality of the "Delete selected" button. It goes through the selected checkboxes array saved in storage and removes those divs with that ID, and also remove them from the selected checkbox array. After that it >location.reload(); reloads the page, so that the paragraphs are regenerated on the page and they get new ID's, so as to not get confused.

#### Next is the funcionality for the Select all button. It goes through the textArray, whose length will be equal to the number of checkboxes and sets all the checkboxes status to "true". Else deselect all, setting the checked status to "false". Every time the name of the button is changed from "Select All" to "Deselect All" to suit the situation.

#### The last thing is the back to top button which scrolls the page to 0,0 position.

<br>

# options.html

#### Contains the html code for the options page, for when you click the "Options" button in the popup, or right click on the extension icon and select "Options". On this page you can see a table, containing your notification setting, and in the future add a dark mode setting and other preferences. After this table, there is the Collection of saved text clips, each with a checkbox. There is a button to delete the selected clips, and a button to select/deselect all text clips. Also a Back to Top button.

<br>

# popup.js

#### Contains the javascript code for the popup that appears when you click on the extension icon or press the keyboard shortcut "Ctrl+Q" or "Command+Q".

#### It prints out the text saved in storage. Just as the collection on the options page, it creates a new div, then goes through the clip array, then each nested array, then "prints" it's value as a div containing the text, buttons and a horizontal line. It also counts the number of characters in the current paragraph and if it is more than 50 it stops generating the rest and instead puts a "View more..." button that redirects you to the collection on the options page.

#### There is also a Delete button, that deletes the paragraph that has the button attached to it.

#### I also added a "View URL" button that takes you back to the URL that you saved the text from.

<br>

# popup.css

#### Contains CSS for the popup.html page

<br>

# popup.html

#### Contains the html code for the popup of the extension. It has a navbar made with bootstrap that has the logo, which if clicked, redirects you to my website, where I made a sort of homepage for the extension, a button that takes you to the collections, and an Options button, that takes you to the options page.

#### Although the options page and the collections page are the same, I decided to have separate buttons for each, so that in the future, when there are multiple settings, or I decide to change the formating of the page, I do not need to change the popup.html navbar.

<br>

# Thank you!

### Thank you so much for this course! I learned so much from it, and more than that, I gained the courage to take on immense learning challenges with curiosity! Thank you so much for the beautifully crafted projects for each week, for the lectures, the notes and the practice problems! Have a great day!
"# quickpaste" 
