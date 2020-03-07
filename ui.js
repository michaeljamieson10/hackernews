$(async function() {
  // cache some selectors we'll be using quite a bit
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $loginForm = $("#login-form");
  
  //nav bar links/buttons
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");
  const $navCreateArticle = $("#nav-create-article");
  const $navFavorites = $("#nav-favorites");
  const $navMyStories = $("#nav-mystories");
  const $navUserProfile = $("#nav-user-profile");
  const $navUsernameText = $("#nav-username-text");

  
  //create forms that create new stories and accounts
  const $createArticleForm = $("#create-article-form");
  const $createAccountForm = $("#create-account-form");
  
  //makes story list for all, favorites, my own
  const $allStoriesList = $("#all-articles-list");
  const $favoriteStories = $("#favorited-articles");
  const $ownStories = $("#my-articles");  
  
  //user profile section
  const $userProfile = $('#user-profile');

  //profile when clicked on nav user
  const $profileName = $('#profile-name');
  const $profileUserName = $("#profile-username");
  const $profileAccountDate = $("#profile-account-date");


  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();

  /**
   * Event listener for logging in.
   *  If success      fully we will setup the user instance
   */

  $loginForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);

    // set the global user to the user instance
    currentUser = userInstance;
    
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });


//event listener for creating story opens up a form
//where user can create a new article

  $createArticleForm.on("submit", async function(evt) {
    evt.preventDefault();//prevents page reload
    const token = localStorage.getItem("token"); // in order to add story it is required to add token

   // takes value from articles' form
    const title = $("#create-title").val();
    const url = $("#create-url").val();
    const author = $("#create-author").val();
   
  // creates an object that matches format to send request
    const newStory = {
          token,
          story: {
              author,
              title,
              url
          }
      }

    //Creates a story with the database
    await StoryList.addStory(currentUser, newStory); //this is a class's method to add a story to the database

    //generates all stories and their html and adds it to the webpage
    await generateStories()

    checkIfLoggedIn() //refreshes user which updates the user, allowing my story to be updated

  });


  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Log Out Functionality
   */

  $navLogOut.on("click", function() {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });
/**
 * Star Functionality
 * on click
 */
  $(document).on("click", ".star",  async function(e){
    let $storyId = $(this).parent().attr("id"); //grabs the parent's id of the star (li) 
    //checks the class if has a filled in star
    if ($(this).children("i").hasClass('fas fa-star')){
      $(this).children("i").attr('class', 'far fa-star') // changes it to an empty star
      //removes the favorite from the users favorite list
     currentUser.favorites = await User.deleteFavoriteStory(currentUser, $storyId); 
    }else{
      //fills in star 
      $(this).children("i").attr('class', 'fas fa-star');
      //adds the favorite from the users favorite list
      currentUser.favorites = await User.addFavoriteStory(currentUser, $storyId); 
    }
  });

  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function() {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle(); 
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
    $userProfile.removeClass('container');

  });

  $navCreateArticle.on("click",  async function() {
    hideElements() // hides other elements and removes the profile container
    await generateStories() //creates a list of stories
    $allStoriesList.show(); //shows all stories from generate stories
    $createArticleForm.slideToggle();//opens up create article form
  });

  $navFavorites.on("click", function() {
    hideElements(); // hides other elements and removes the profile container
    generateFavoriteStories() // creates a list of favorite stories
    $favoriteStories.show(); // shows all favorited stories that we created when we fill in a star by clicking on it
  });

  $navMyStories.on("click", function() {
    hideElements(); // hides other elements and removes the profile container
    generateMyStories();
    $ownStories.show();

    //creates a garbage can logo that if clicked will remove from DOM and database
    createGarbageCan()
    
  });

  function createGarbageCan() {
      $(document).on("click", ".trash-can", async function(e){
        if(currentUser.ownStories.length === 0){
          $ownStories.text("No Stories Owned.");
        }else{
          //targets the li of the story (the entire story)
          let $storyId = $(this).parent().attr("id");
          //removes the li from the dom
          $(this).parent().remove();
          //removes from the database
          await StoryList.removeStory(currentUser, $storyId);
          checkIfLoggedIn() //refreshes user
        }
    })
  }
  
  $navUserProfile.on("click", function(){
    hideElements(); // hides other elements and removes the profile container
    $userProfile.addClass('container');
    $profileName.text(`Name: ${currentUser.name}`);
    $profileUserName.text(`Username: ${currentUser.username}`);
    $profileAccountDate.text(`Account Created: ${getAccountDate(currentUser.createdAt)}`);  
  })
  
 
  /**
   * Event handler for Navigation to Homepage
   */

  $("body").on("click", "#nav-all", async function() {
    hideElements();
    await generateStories();
    $allStoriesList.show();
  });

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      showNavForLoggedInUser();
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();
    $favoriteStories.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }
  }
 
  function generateFavoriteStories() {
    // set our storyList to current User's favorites
    storyList = currentUser.favorites;
    // empty out that part of the page
    $allStoriesList.empty();
    $favoriteStories.empty();
      if(currentUser.favorites.length === 0){
        $favoriteStories.text("No Favorites Added!");
      }else{
      // loop through all of our favorite stories and generate HTML for them
      for (let story of currentUser.favorites) {
        const result = generateStoryHTML(story);
        $favoriteStories.append(result);
      }
    }
  }
  
 function generateMyStories() {
    // set our storyList to current User's stories
    storyList = currentUser.ownStories;
    //empty the list from other lists and any previous user's stories list
    $allStoriesList.empty();
    $favoriteStories.empty();
    $ownStories.empty();

      //if user's own stories is empty change text to no stories owned
      if(currentUser.ownStories.length === 0){
        $ownStories.text("No Stories Owned.");
      }else{
      //if user's story is not empty add the stories to the DOM
        for (let story of currentUser.ownStories) {
          //creates html for the stories
          const result = generateStoryHTML(story);
          //adds a trashcan button for the user's stories
          result.prepend( `<span class="trash-can"><i class="fa fa-trash"></i></span>` );
          //adds result to DOM
          $ownStories.append(result);
        }
    }
  }
 
  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story) {
    let hostName = getHostName(story.url);

    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
        <span class="star"><i class="${favoriteStoryOrNot()}"></i></span>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);


// adds a filled in star depending if in user's favorite
    function favoriteStoryOrNot() {
        if(currentUser !== null){
          for (let storyFav of currentUser.favorites) {
            if(storyFav.storyId === story.storyId){
              return 'fas fa-star';
            }
          } 
        } 
        return 'far fa-star';
      }
    

      return storyMarkup;
  }

  /* hide all elements in elementsArr and
   removes container class from userPRofile */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm,
      $favoriteStories,
      $createArticleForm
    ];
    elementsArr.forEach($elem => $elem.hide());
    $userProfile.removeClass('container');
  }
//show all nav elements for a logged in user
  function showNavForLoggedInUser() {
    $navLogin.hide();
    const elementsArr = [
      $navLogOut,
      $navCreateArticle,
      $navFavorites,
      $navMyStories,
      $navUserProfile,
      $('span')
    ];
    elementsArr.forEach($elem => $elem.show());
    $navUsernameText.html(currentUser.username);
    $('span').show();
  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }
// Extract the account date from the account created property from user.
  function getAccountDate(createdDate){
    let accountDateCreated;
    accountDateCreated = createdDate.split("T");
    return accountDateCreated[0];
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});
