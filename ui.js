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


    await generateStories()
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

  $(document).on("click", ".star",  async function(e){
    let $storyId = $(this).parent().attr("id");
    if ($(this).children("i").hasClass('fas fa-star')){
      $(this).children("i").attr('class', 'far fa-star')
     currentUser.favorites = await User.deleteFavoriteStory(currentUser, $storyId);


    }else{
      $(this).children("i").attr('class', 'fas fa-star');
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
    await generateStories()

    $createArticleForm.slideToggle();
    $allStoriesList.show();
    $ownStories.hide();
    $userProfile.removeClass('container');

  });
  $navFavorites.on("click", async function() {
    await generateFavoriteStories()
    $allStoriesList.hide();
    $favoriteStories.show();
    $ownStories.hide();
    $createArticleForm.slideUp();
    $userProfile.removeClass('container');


  });
  $navMyStories.on("click", async function() {
    await generateMyStories();
    $favoriteStories.hide();
    $allStoriesList.hide();
    $ownStories.show();
    $createArticleForm.slideUp();
    $userProfile.removeClass('container');

    $(document).on("click", ".trash-can", async function(e){
      let $storyId = $(this).parent().attr("id");
      $(this).parent().remove();
      await StoryList.removeStory(currentUser, $storyId);
      await generateStories()

      
    })

  });
  $navUserProfile.on("click", function(){
    $allStoriesList.empty();
    $favoriteStories.empty();
    $ownStories.empty();
    $ownStories.hide();
    $allStoriesList.hide();

    $userProfile.addClass('container');
    $profileName.text(`Name: ${currentUser.name}`);
    $profileUserName.text(`Username: ${currentUser.username}`);
    $profileAccountDate.text(`Account Created: ${getAccountDate(currentUser.createdAt)}`);
    

  })

  /**
   * Event handler for Navigation to Homepage
   */

  $("body").on("click", "#nav-all", async function() {
    $userProfile.removeClass('container');

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
 
  async function generateFavoriteStories() {
    // set our storyList to current User
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
  
  async function generateMyStories() {
    storyList = currentUser.ownStories;
    $allStoriesList.empty();
    $favoriteStories.empty();
    $ownStories.empty();
      if(currentUser.favorites.length === 0){
        $ownStories.text("No Stories Owned.");
      }else{
        for (let story of currentUser.ownStories) {

          const result = generateStoryHTML(story);
          result.prepend( `<span class="trash-can"><i class="fa fa-trash"></i></span>` );
          console.log(result)

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
// far fa-star
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

  /* hide all elements in elementsArr */

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
  }

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
    // console.log(elementsArr);
    // $navLogOut.show();
    // $createStory.show();
    // $navFavorites.show();
    // $navMyStories.show();
    // $navUserProfile.show();
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
// Simple function to pull the account date from the account created property from user.
  function getAccountDate(createdDate){
    let accountDateCreated;
    let thirdTry;
    console.log(createdDate);
    accountDateCreated = createdDate.split("T");
    console.log(accountDateCreated[0]);
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
